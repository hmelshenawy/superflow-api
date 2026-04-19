import { Controller, Get, Post, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private service: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Register a file upload (returns S3 key)' })
  upload(@Body() dto: PresignUploadDto, @CurrentUser('sub') userId: string) { return this.service.registerUpload(dto, userId); }

  @Get('job/:jobId')
  findByJob(@Param('jobId') jobId: string) { return this.service.findByJob(jobId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a file' })
  remove(@Param('id') id: string) { return this.service.softDelete(id); }
}