import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, StreamableFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, MEDIA_UPLOAD, MEDIA_DELETE } from '../common/permissions';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ALLOWED_MIME_TYPES } from './dto/presign-upload.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function toSafeInlineDisposition(filename?: string | null) {
  const fallback = 'file';
  const cleaned = (filename || fallback)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();

  return `inline; filename="${cleaned || fallback}"`;
}

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('media')
export class MediaController {
  constructor(private service: MediaService) {}

  @Post('presign')
  @RequirePermission(MEDIA_UPLOAD)
  @ApiOperation({ summary: 'Get MinIO/S3 presigned upload URL' })
  presign(@Body() dto: PresignUploadDto, @CurrentUser('sub') userId: string) {
    return this.service.presign(dto, userId);
  }

  @Post('confirm')
  @RequirePermission(MEDIA_UPLOAD)
  @ApiOperation({ summary: 'Confirm upload finished and persist metadata' })
  confirm(
    @Body() body: { id: string; size_bytes?: number; width_px?: number; height_px?: number; duration_sec?: number; thumbnail_key?: string },
  ) {
    return this.service.confirm(body.id, body);
  }

  @Post('upload-direct')
  @RequirePermission(MEDIA_UPLOAD)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiOperation({ summary: 'Upload media directly through API' })
  uploadDirect(
    @UploadedFile() file: any,
    @Body() dto: PresignUploadDto,
    @CurrentUser('sub') userId: string,
  ) {
    if (file && file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type ${file.mimetype} is not allowed`);
    }
    return this.service.uploadDirect(dto, file, userId);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed download URL' })
  getSignedUrl(@Param('id') id: string) {
    return this.service.getSignedDownloadUrl(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download/stream media content' })
  async download(@Param('id') id: string) {
    const file = await this.service.getDownloadStream(id);
    return new StreamableFile(file.stream as any, {
      type: file.mime_type || 'application/octet-stream',
      disposition: toSafeInlineDisposition(file.filename),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media record' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Delete(':id')
  @RequirePermission(MEDIA_DELETE)
  @ApiOperation({ summary: 'Soft delete media record' })
  remove(@Param('id') id: string) { return this.service.softDelete(id); }
}