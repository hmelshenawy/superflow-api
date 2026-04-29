import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingImportService } from './booking-import.service';
import { RunImportDto, SaveTemplateDto } from './dto/booking-import.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Booking Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('booking-import')
export class BookingImportController {
  constructor(private service: BookingImportService) {}

  // ─── File Parsing ──────────────────────────────────────

  @Post('parse')
  @Roles('admin', 'manager', 'advisor')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and parse an Excel/CSV file, return headers + preview rows' })
  @UseInterceptors(FileInterceptor('file'))
  parseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    return this.service.parseFile(file);
  }

  // ─── Templates ─────────────────────────────────────────

  @Get('templates')
  @Roles('admin', 'manager', 'advisor')
  @ApiOperation({ summary: 'List saved import templates' })
  listTemplates() {
    return this.service.listTemplates();
  }

  @Get('templates/:id')
  @Roles('admin', 'manager', 'advisor')
  @ApiOperation({ summary: 'Get a template by ID' })
  getTemplate(@Param('id') id: string) {
    return this.service.getTemplate(id);
  }

  @Post('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Save a column-mapping template' })
  saveTemplate(@Body() dto: SaveTemplateDto, @CurrentUser('sub') userId: string) {
    return this.service.saveTemplate(dto, userId);
  }

  @Delete('templates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete a template' })
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  // ─── Import ────────────────────────────────────────────

  @Post('run')
  @Roles('admin', 'manager', 'advisor')
  @ApiOperation({ summary: 'Run the import with column mappings and parsed rows' })
  runImport(@Body() dto: RunImportDto, @CurrentUser('sub') userId: string) {
    return this.service.runImport(dto, userId);
  }
}