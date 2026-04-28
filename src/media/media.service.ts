import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

  private async generateCleanFilename(jobId: string, ext: string): Promise<string> {
    // Media filenames are normalized up front because original phone/browser
    // filenames often contain characters that later break HTTP headers.
    const job = await this.prisma.jobs.findUnique({ where: { id: jobId }, select: { job_number: true } });
    const jobNum = (job?.job_number || jobId.slice(0, 8)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').replace(/\..+/, '');
    // e.g. SF-MOGZ76J8_20260427_160100.jpg
    return `${jobNum}_${ts}.${ext}`;
  }

  private async resolveInspectionResponseId(dto: PresignUploadDto) {
    if (dto.inspection_response_id) return dto.inspection_response_id;
    // Some upload flows know only inspection + item, not the response row yet.
    // In that case we create a placeholder response so media still has a stable link.
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
    // Presign flow creates the DB record before the binary upload completes.
    // That keeps metadata and future confirmation tied to one stable media id.
    const bucket = process.env.S3_BUCKET || 'superflow-media';
    const inspectionResponseId = await this.resolveInspectionResponseId(dto);
    const mediaId = uuid();
    const ext = (dto.filename.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanName = await this.generateCleanFilename(dto.job_id, ext);
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${cleanName}`;

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
        original_filename: cleanName,
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
    // Direct upload is the simpler fallback path when the client cannot or
    // should not upload straight to object storage.
    if (!file) throw new BadRequestException('File is required');

    const bucket = process.env.S3_BUCKET || 'superflow-media';
    const inspectionResponseId = await this.resolveInspectionResponseId(dto);
    const mediaId = uuid();
    const rawName = dto.filename || file.originalname;
    const ext = (rawName.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanName = await this.generateCleanFilename(dto.job_id, ext);
    const s3Key = `uploads/${dto.job_id}/${mediaId}/${cleanName}`;

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
        original_filename: cleanName,
        size_bytes: file.size,
        scan_status: 'pending',
        uploaded_at: new Date(),
      },
    });

    if (inspectionResponseId) {
      // Response media_count is denormalized for quick UI rendering on inspection
      // screens, so uploads/deletes must keep it in sync.
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
    // Stream-through download keeps storage private; callers do not need direct
    // bucket credentials or publicly reachable MinIO endpoints.
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
    return files.map((file: (typeof files)[number]) => this.normalizeMedia(file));
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
