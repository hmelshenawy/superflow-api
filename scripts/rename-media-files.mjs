/**
 * One-time migration: rename existing media files in S3 + DB to the new
 * {job_number}_{timestamp}.{ext} format.
 * 
 * Usage: docker compose exec api node dist/scripts/rename-media-files.mjs
 * Or:  node --env-file=.env scripts/rename-media-files.mjs
 */

import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

const prisma = new PrismaClient();
const BUCKET = process.env.S3_BUCKET || 'superflow-media';

// Regex: filenames that do NOT match the new format {JOBNUM}_{YYYYMMDD}_{HHMMSS}.{ext}
const OLD_FORMAT = /^(?!.*_\d{8}_\d{6}\.).+$/;

async function main() {
  const files = await prisma.media_files.findMany({
    where: { is_deleted: false },
    include: { jobs: { select: { job_number: true } } },
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    // Skip if already in new format
    if (!OLD_FORMAT.test(file.original_filename) && !file.original_filename.includes(' ')) {
      console.log(`⏭  Skipping (already clean): ${file.original_filename}`);
      skipped++;
      continue;
    }

    const jobNumber = (file.jobs?.job_number || file.job_id.slice(0, 8)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = (file.original_filename.split('.').pop() || file.mime_type?.split('/').pop() || 'jpg')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    
    // Use uploaded_at timestamp for deterministic naming, fall back to id suffix for uniqueness
    const ts = file.uploaded_at
      ? file.uploaded_at.toISOString().replace(/[-:]/g, '').replace('T', '_').replace(/\..+/, '')
      : `unknown_${file.id.slice(0, 8)}`;

    const newFilename = `${jobNumber}_${ts}.${ext}`;
    const newS3Key = `uploads/${file.job_id}/${file.id}/${newFilename}`;

    console.log(`🔄 ${file.original_filename} → ${newFilename}`);

    try {
      // 1. Copy to new key in S3
      await s3.send(new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${file.s3_key}`,
        Key: newS3Key,
      }));

      // 2. Update DB
      await prisma.media_files.update({
        where: { id: file.id },
        data: {
          original_filename: newFilename,
          s3_key: newS3Key,
        },
      });

      // 3. Delete old key from S3
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: file.s3_key,  // This is still the OLD key since we just updated
        }));
      } catch (delErr) {
        console.warn(`⚠️  Could not delete old key (non-critical): ${delErr.message}`);
      }

      console.log(`  ✅ Done`);
      migrated++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Results: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});