import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async registerUpload(dto: PresignUploadDto, userId: string) {
    // In production: generate S3 presigned URL here
    const s3Key = `uploads/${dto.job_id}/${uuid()}/${dto.filename}`;
    return this.prisma.media_files.create({
      data: {
        id: uuid(), job_id: dto.job_id, inspection_response_id: dto.inspection_response_id,
        uploaded_by: userId, s3_bucket: process.env.S3_BUCKET || 'superflow-media',
        s3_key: s3Key, file_type: dto.file_type as any,
        mime_type: dto.mime_type, original_filename: dto.filename,
        scan_status: 'pending',
      },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.media_files.findMany({
      where: { job_id: jobId, is_deleted: false },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.media_files.findUnique({ where: { id } });
    if (!file || file.is_deleted) throw new NotFoundException('File not found');
    return file;
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.media_files.update({ where: { id }, data: { is_deleted: true } });
  }
}