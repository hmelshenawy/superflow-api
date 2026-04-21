import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  private normalizeMedia<T extends Record<string, any>>(file: T): T {
    return {
      ...file,
      size_bytes: typeof file?.size_bytes === 'bigint' ? Number(file.size_bytes) : file?.size_bytes,
    };
  }

  private getS3() {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException('S3/MinIO is not configured');
    }

    return new S3Client({
      endpoint,
      region,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async presign(dto: PresignUploadDto, userId: string) {
    const bucket = process.env.S3_BUCKET || 'superflow-media';
    const mediaId = uuid();
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${safeName}`;

    const client = this.getS3();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: dto.mime_type || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 15 * 60 });

    await this.prisma.media_files.create({
      data: {
        id: mediaId,
        job_id: dto.job_id,
        inspection_response_id: dto.inspection_response_id,
        uploaded_by: userId,
        s3_bucket: bucket,
        s3_key: s3Key,
        file_type: dto.file_type as any,
        mime_type: dto.mime_type,
        original_filename: dto.filename,
        scan_status: 'pending',
      },
    });

    return {
      id: mediaId,
      bucket,
      key: s3Key,
      uploadUrl,
      expiresIn: 900,
      method: 'PUT',
    };
  }

  async confirm(id: string, body: { size_bytes?: number; width_px?: number; height_px?: number; duration_sec?: number; thumbnail_key?: string }) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');

    const updated = await this.prisma.media_files.update({
      where: { id },
      data: {
        size_bytes: body.size_bytes,
        width_px: body.width_px,
        height_px: body.height_px,
        duration_sec: body.duration_sec,
        thumbnail_key: body.thumbnail_key,
        uploaded_at: new Date(),
      },
    });

    return this.normalizeMedia(updated);
  }

  async uploadDirect(
    dto: PresignUploadDto,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const bucket = process.env.S3_BUCKET || 'superflow-media';
    const mediaId = uuid();
    const safeName = (dto.filename || file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${safeName}`;

    const client = this.getS3();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: file.buffer,
        ContentType: dto.mime_type || file.mimetype || 'application/octet-stream',
      }),
    );

    const created = await this.prisma.media_files.create({
      data: {
        id: mediaId,
        job_id: dto.job_id,
        inspection_response_id: dto.inspection_response_id,
        uploaded_by: userId,
        s3_bucket: bucket,
        s3_key: s3Key,
        file_type: dto.file_type as any,
        mime_type: dto.mime_type || file.mimetype,
        original_filename: dto.filename || file.originalname,
        size_bytes: file.size,
        scan_status: 'pending',
        uploaded_at: new Date(),
      },
    });

    return this.normalizeMedia(created);
  }

  async getSignedDownloadUrl(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    if (!file.s3_bucket || !file.s3_key) throw new BadRequestException('File storage details missing');

    const client = this.getS3();
    const command = new GetObjectCommand({
      Bucket: file.s3_bucket,
      Key: file.s3_key,
      ResponseContentType: file.mime_type || undefined,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 15 * 60 });

    return {
      id: file.id,
      url,
      expiresIn: 900,
      filename: file.original_filename,
      mime_type: file.mime_type,
    };
  }

  async findByJob(jobId: string) {
    const files = await this.prisma.media_files.findMany({
      where: { job_id: jobId, is_deleted: false },
      orderBy: { uploaded_at: 'desc' },
    });
    return files.map((file) => this.normalizeMedia(file));
  }

  async findOne(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    return this.normalizeMedia(file);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.media_files.update({ where: { id }, data: { is_deleted: true } });
  }
}
