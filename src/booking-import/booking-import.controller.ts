import {
  BadRequestException, Controller, Get, Post, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingImportService } from './booking-import.service';
import { RunImportDto, SaveTemplateDto } from './dto/booking-import.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, IMPORT_PARSE, IMPORT_RUN } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMPORT_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/octet-stream',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

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
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype && !ALLOWED_IMPORT_MIME_TYPES.has(file.mimetype)) {
        cb(new BadRequestException(`File type ${file.mimetype} is not allowed. Upload .xlsx, .xls, or .csv files.`), false);
        return;
      }
      cb(null, true);
    },
  }))
  parseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
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
