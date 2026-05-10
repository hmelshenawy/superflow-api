/**
 * File Upload & Booking Import Security Tests
 *
 * Run: npx ts-node -r tsconfig-paths/register test/file-security.ts
 *
 * What it tests:
 * 1. Booking import rejects legacy .xls files
 * 2. Booking import accepts .csv and .xlsx files
 * 3. Booking import row limits are enforced
 * 4. Booking import requires mappings or a template
 * 5. Booking import without workshop context does not create tenant data
 * 6. Booking import creates tenant-scoped jobs with workshop context
 * 7. Media upload rejects bad extensions, MIME mismatches, and over-size files
 * 8. Pending image previews are downloadable, but pending documents/videos are blocked
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import * as ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { BookingImportService } from '../src/booking-import/booking-import.service';
import { MediaService } from '../src/media/media.service';
import { workshopTenantExtension } from '../src/prisma/prisma-tenant.extension';
import { runWithWorkshop } from '../src/prisma/workshop-context';

const green = (s: string) => `\x1b[32m✓ ${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m✗ ${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(green(label));
    passed++;
  } else {
    console.log(red(label));
    failed++;
  }
}

async function assertRejects(fn: () => Promise<unknown>, label: string, matcher?: (err: any) => boolean) {
  try {
    await fn();
    assert(false, label);
  } catch (err: any) {
    assert(matcher ? matcher(err) : true, label);
  }
}

function multerFile(originalname: string, mimetype: string, buffer: Buffer): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    stream: undefined as any,
    destination: '',
    filename: originalname,
    path: '',
  };
}

async function xlsxBuffer(rows: string[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bookings');
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const raw = new PrismaClient();
const tenant = raw.$extends(workshopTenantExtension);
const prisma = { raw, tenant } as any;
const bookingImport = new BookingImportService(prisma);
const s3 = new S3Client({
  region: 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  endpoint: 'http://127.0.0.1:9000',
  forcePathStyle: true,
});
const media = new MediaService(prisma, s3);

const workshopA = 'test-file-ws-a-000001';
const workshopB = 'test-file-ws-b-000001';
const roleId = 'test-file-role-000001';
const userA = 'test-file-user-a-0001';
const userB = 'test-file-user-b-0001';
const customerA = 'test-file-cust-a-0001';
const vehicleA = 'test-file-veh-a-0001';
const jobA = 'test-file-job-a-0001';

async function setup() {
  console.log('\nSetting up file security test data...\n');
  await cleanup();

  await raw.workshops.createMany({
    data: [
      { id: workshopA, name: 'File Test Workshop A', slug: 'file-test-a', is_active: true },
      { id: workshopB, name: 'File Test Workshop B', slug: 'file-test-b', is_active: true },
    ],
  });
  await raw.roles.create({
    data: { id: roleId, name: 'test_file_advisor', permissions: '[]' },
  });
  await raw.users.createMany({
    data: [
      { id: userA, email: 'file-a@test.prioraflow.com', name: 'File User A', role_id: roleId, is_active: true },
      { id: userB, email: 'file-b@test.prioraflow.com', name: 'File User B', role_id: roleId, is_active: true },
    ],
  });
  await raw.user_workshop_access.createMany({
    data: [
      { id: 'test-file-uwa-a', user_id: userA, workshop_id: workshopA },
      { id: 'test-file-uwa-b', user_id: userB, workshop_id: workshopB },
    ],
  });
  await raw.customers.create({
    data: { id: customerA, name: 'File Customer A', workshop_id: workshopA },
  });
  await raw.vehicles.create({
    data: { id: vehicleA, customer_id: customerA, plate: 'FILE-A', workshop_id: workshopA },
  });
  await raw.jobs.create({
    data: {
      id: jobA,
      job_number: 'FILE-A-001',
      status: 'booked',
      customer_id: customerA,
      vehicle_id: vehicleA,
      workshop_id: workshopA,
      advisor_id: userA,
    },
  });
}

async function cleanup() {
  await raw.media_files.deleteMany({ where: { id: { startsWith: 'test-file-' } } });
  await raw.jobs.deleteMany({ where: { id: { startsWith: 'test-file-job-' } } });
  await raw.vehicles.deleteMany({ where: { id: { startsWith: 'test-file-veh-' } } });
  await raw.customers.deleteMany({ where: { id: { startsWith: 'test-file-cust-' } } });
  await raw.user_workshop_access.deleteMany({ where: { id: { startsWith: 'test-file-uwa-' } } });
  await raw.users.deleteMany({ where: { id: { startsWith: 'test-file-user-' } } });
  await raw.roles.deleteMany({ where: { id: roleId } });
  await raw.workshops.deleteMany({ where: { id: { in: [workshopA, workshopB] } } });
}

async function testBookingImportParsing() {
  console.log('\nBOOKING IMPORT — file type and size parsing rules\n');

  await assertRejects(
    () => bookingImport.parseFile(multerFile('old-bookings.xls', 'application/vnd.ms-excel', Buffer.from('xls'))),
    'Legacy .xls files are rejected',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );

  const csv = Buffer.from('Customer Name,Plate,Job Number\nCustomer CSV,CSV-1,CSV-001\n');
  const csvResult = await bookingImport.parseFile(multerFile('bookings.csv', 'text/csv', csv));
  assert(csvResult.totalRows === 1 && csvResult.headers.includes('Customer Name'), 'CSV booking import parses headers and rows');

  const xlsx = await xlsxBuffer([
    ['Customer Name', 'Plate', 'Job Number'],
    ['Customer XLSX', 'XLSX-1', 'XLSX-001'],
  ]);
  const xlsxResult = await bookingImport.parseFile(
    multerFile('bookings.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xlsx),
  );
  assert(xlsxResult.totalRows === 1 && xlsxResult.headers.includes('Customer Name'), 'XLSX booking import parses headers and rows');

  const tooManyRows = Buffer.from(
    ['Customer Name,Plate,Job Number']
      .concat(Array.from({ length: 1001 }, (_, i) => `Customer ${i},PLATE-${i},JOB-${i}`))
      .join('\n'),
  );
  await assertRejects(
    () => bookingImport.parseFile(multerFile('too-many.csv', 'text/csv', tooManyRows)),
    'Booking import row limit is enforced during parse',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );
}

async function testBookingImportTenantRules() {
  console.log('\nBOOKING IMPORT — tenant-scoped import rules\n');

  await assertRejects(
    () => bookingImport.runImport({ rows: [{ 'Customer Name': 'No Mapping' }] }, userA),
    'Import requires mappings or a template',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );

  const noContextResult = await bookingImport.runImport({
    mappings: [{ source: 'Customer Name', target: 'customer_name' }],
    rows: [{ 'Customer Name': 'No Context Customer' }],
  }, userA);
  const noContextCreated = await raw.customers.findFirst({ where: { name: 'No Context Customer' } });
  assert(noContextResult.created === 0 && noContextResult.errors.length === 1 && !noContextCreated, 'Import without workshop context does not create tenant data');

  const importResult = await runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => bookingImport.runImport({
    mappings: [
      { source: 'Customer Name', target: 'customer_name' },
      { source: 'Plate', target: 'vehicle_plate' },
      { source: 'Job Number', target: 'job_number' },
    ],
    rows: [{ 'Customer Name': 'Tenant Import Customer', Plate: 'TENANT-1', 'Job Number': 'TENANT-IMPORT-001' }],
  }, userA));

  const createdJob = await raw.jobs.findFirst({ where: { job_number: 'TENANT-IMPORT-001' } });
  assert(importResult.created === 1 && createdJob?.workshop_id === workshopA, 'Import with workshop context creates tenant-scoped jobs');
}

async function testMediaValidationRules() {
  console.log('\nMEDIA — upload validation rules\n');

  await assertRejects(
    () => runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.presign({
      job_id: jobA,
      file_type: 'photo',
      filename: 'shell.exe',
      mime_type: 'image/jpeg',
      size_bytes: 1024,
    }, userA)),
    'Media upload rejects unsupported file extensions',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );

  await assertRejects(
    () => runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.presign({
      job_id: jobA,
      file_type: 'photo',
      filename: 'photo.jpg',
      mime_type: 'application/pdf',
      size_bytes: 1024,
    }, userA)),
    'Media upload rejects extension/MIME mismatch',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );

  await assertRejects(
    () => runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.presign({
      job_id: jobA,
      file_type: 'photo',
      filename: 'huge.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 11 * 1024 * 1024,
    }, userA)),
    'Media upload enforces per-type size limits',
    (err) => err instanceof BadRequestException || err?.status === 400,
  );
}

async function testPendingDownloadPolicy() {
  console.log('\nMEDIA — pending download policy\n');

  await raw.media_files.createMany({
    data: [
      {
        id: 'test-file-media-photo',
        job_id: jobA,
        uploaded_by: userA,
        workshop_id: workshopA,
        s3_bucket: 'test-bucket',
        s3_key: 'test/photo.jpg',
        file_type: 'photo',
        mime_type: 'image/jpeg',
        original_filename: 'photo.jpg',
        scan_status: 'pending',
        is_deleted: false,
      },
      {
        id: 'test-file-media-doc',
        job_id: jobA,
        uploaded_by: userA,
        workshop_id: workshopA,
        s3_bucket: 'test-bucket',
        s3_key: 'test/doc.pdf',
        file_type: 'document',
        mime_type: 'application/pdf',
        original_filename: 'doc.pdf',
        scan_status: 'pending',
        is_deleted: false,
      },
      {
        id: 'test-file-media-video',
        job_id: jobA,
        uploaded_by: userA,
        workshop_id: workshopA,
        s3_bucket: 'test-bucket',
        s3_key: 'test/video.mp4',
        file_type: 'video',
        mime_type: 'video/mp4',
        original_filename: 'video.mp4',
        scan_status: 'pending',
        is_deleted: false,
      },
    ],
  });

  const photoUrl = await runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.getSignedDownloadUrl('test-file-media-photo'));
  assert(!!photoUrl.url, 'Pending image preview downloads are allowed');

  await assertRejects(
    () => runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.getSignedDownloadUrl('test-file-media-doc')),
    'Pending documents are blocked from download',
    (err) => err instanceof ForbiddenException || err?.status === 403,
  );
  await assertRejects(
    () => runWithWorkshop({ workshopId: workshopA, isPlatformAdmin: false }, () => media.getSignedDownloadUrl('test-file-media-video')),
    'Pending videos are blocked from download',
    (err) => err instanceof ForbiddenException || err?.status === 403,
  );
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  PrioraFlow — File Security Test Suite');
  console.log('═══════════════════════════════════════════════════');

  try {
    await setup();
    await testBookingImportParsing();
    await testBookingImportTenantRules();
    await testMediaValidationRules();
    await testPendingDownloadPolicy();
    await cleanup();

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Results: ${green(`${passed} passed`)} ${failed > 0 ? red(`${failed} failed`) : ''}`);
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\nTest runner error:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await raw.$disconnect();
  }
}

main();
