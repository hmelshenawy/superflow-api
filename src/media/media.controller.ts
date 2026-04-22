import { Controller, Get, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private service: MediaService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get MinIO/S3 presigned upload URL' })
  presign(@Body() dto: PresignUploadDto, @CurrentUser('sub') userId: string) {
    return this.service.presign(dto, userId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm upload finished and persist metadata' })
  confirm(
    @Body() body: { id: string; size_bytes?: number; width_px?: number; height_px?: number; duration_sec?: number; thumbnail_key?: string },
  ) {
    return this.service.confirm(body.id, body);
  }

  @Post('upload-direct')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload media directly through API' })
  uploadDirect(
    @UploadedFile() file: any,
    @Body() dto: PresignUploadDto,
    @CurrentUser('sub') userId: string,
  ) {
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
      disposition: `inline; filename="${file.filename || 'file'}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media record' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete media record' })
  remove(@Param('id') id: string) { return this.service.softDelete(id); }
}
