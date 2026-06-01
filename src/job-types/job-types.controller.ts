import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RequireModule, MODULE_KEYS } from '../common/product-modes';
import { JobTypesService } from './job-types.service';
import { CreateJobTypeDto } from './dto/create-job-type.dto';
import { ImportJobTypesDto } from './dto/import-job-types.dto';
import { UpdateJobTypeDto } from './dto/update-job-type.dto';

@ApiTags('Job Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireModule(MODULE_KEYS.APPOINTMENTS)
@Controller('job-types')
export class JobTypesController {
  constructor(private service: JobTypesService) {}

  @Get('templates')
  templates() { return this.service.templates(); }

  @Post('import')
  importTemplates(@Body() dto: ImportJobTypesDto) { return this.service.importTemplates(dto); }

  @Get('categories')
  categories() { return this.service.categories(); }

  @Get()
  findAll() { return this.service.findAll(); }

  @Post()
  create(@Body() dto: CreateJobTypeDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobTypeDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
