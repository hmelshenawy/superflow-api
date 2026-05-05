import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingImportService } from './booking-import.service';
import { RunImportDto, SaveTemplateDto } from './dto/booking-import.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, IMPORT_PARSE, IMPORT_RUN } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Booking Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('booking-import')
export class BookingImportController {
  constructor(private service: BookingImportService) {}

  @Post('parse')
  @RequirePermission(IMPORT_PARSE)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and parse an Excel/CSV file, return headers + preview rows' })
  @UseInterceptors(FileInterceptor('file'))
  parseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.service.parseFile(file);
  }

  @Get('templates')
  @RequirePermission(IMPORT_PARSE)
  @ApiOperation({ summary: 'List saved import templates' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Get('templates/:id')
  @RequirePermission(IMPORT_PARSE)
  @ApiOperation({ summary: 'Get a template by ID' })
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @Post('templates')
  @RequirePermission(IMPORT_PARSE)
  @ApiOperation({ summary: 'Save a column-mapping template' })
  saveTemplate(@Body() dto: SaveTemplateDto, @CurrentUser('sub') userId: string) {
    return this.service.saveTemplate(dto, userId);
  }

  @Delete('templates/:id')
  @RequirePermission(IMPORT_PARSE)
  @ApiOperation({ summary: 'Delete a template' })
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Post('run')
  @RequirePermission(IMPORT_RUN)
  @ApiOperation({ summary: 'Run the import with column mappings and parsed rows' })
  runImport(@Body() dto: RunImportDto, @CurrentUser('sub') userId: string) {
    return this.service.runImport(dto, userId);
  }
}