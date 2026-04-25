import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { media_files } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_CLIENT } from './media.constants';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    @Inject(S3_CLIENT) private s3: S3Client,
  ) {}

  private async resolveInspectionResponseId(dto: PresignUploadDto) {
    if (dto.inspection_response_id) return dto.inspection_response_id;
    if (!dto.inspection_id || !dto.item_id) return undefined;

    const existing = await this.prisma.inspection_responses.findFirst({
      where: { inspection_id: dto.inspection_id, item_id: dto.item_id },
    });
    if (existing) return existing.id;

    const created = await this.prisma.inspection_responses.create({
      data: {
        id: uuid(),
        inspection_id: dto.inspection_id,
        item_id: dto.item_id,
        value: '',
        urgency: 'none',
        tech_notes: '',
        media_count: 0,
      },
    });
    return created.id;
  }

  private normalizeMedia<T extends Record<string, any>>(file: T): T {
    return {
      ...file,
      size_bytes: typeof file?.size_bytes === 'bigint' ? Number(file.size_bytes) : file?.size_bytes,
    };
  }

  async presign(dto: PresignUploadDto, userId: string) {
    const bucket = process.env.S3_BUCKET || 'superflow-media';
    const inspectionResponseId = await this.resolveInspectionResponseId(dto);
    const mediaId = uuid();
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: dto.mime_type || 'application/octet-stream',
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 });

    await this.prisma.media_files.create({
      data: {
        id: mediaId,
        job_id: dto.job_id,
        inspection_response_id: inspectionResponseId,
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
    const inspectionResponseId = await this.resolveInspectionResponseId(dto);
    const mediaId = uuid();
    const safeName = (dto.filename || file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${safeName}`;

    await this.s3.send(
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
        inspection_response_id: inspectionResponseId,
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

    if (inspectionResponseId) {
      await this.prisma.inspection_responses.update({
        where: { id: inspectionResponseId },
        data: { media_count: { increment: 1 } },
      }).catch(() => {});
    }

    return this.normalizeMedia(created);
  }

  async getSignedDownloadUrl(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    if (!file.s3_bucket || !file.s3_key) throw new BadRequestException('File storage details missing');

    const command = new GetObjectCommand({
      Bucket: file.s3_bucket,
      Key: file.s3_key,
      ResponseContentType: file.mime_type || undefined,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 });

    return {
      id: file.id,
      url,
      expiresIn: 900,
      filename: file.original_filename,
      mime_type: file.mime_type,
    };
  }

  async getDownloadStream(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    if (!file.s3_bucket || !file.s3_key) throw new BadRequestException('File storage details missing');

    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: file.s3_bucket,
        Key: file.s3_key,
        ResponseContentType: file.mime_type || undefined,
      }),
    );

    return {
      stream: result.Body,
      mime_type: file.mime_type,
      filename: file.original_filename,
    };
  }

  async findByJob(jobId: string) {
    const files = await this.prisma.media_files.findMany({
      where: { job_id: jobId, is_deleted: false },
      orderBy: { uploaded_at: 'desc' },
    });
    return files.map((file: media_files) => this.normalizeMedia(file));
  }

  async findOne(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    return this.normalizeMedia(file);
  }

  async softDelete(id: string) {
    const file = await this.findOne(id);
    const deleted = await this.prisma.media_files.update({ where: { id }, data: { is_deleted: true } });
    if ((file as any).inspection_response_id) {
      await this.prisma.inspection_responses.update({
        where: { id: (file as any).inspection_response_id },
        data: { media_count: { decrement: 1 } },
      }).catch(() => {});
    }
    return deleted;
  }
}
