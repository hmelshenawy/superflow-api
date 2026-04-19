import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private service: InspectionsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create inspection for a job' })
  create(@Body() body: { jobId: string; templateId: string }, @CurrentUser('sub') userId: string) {
    return this.service.create(body.jobId, body.templateId, userId);
  }

  @Post('response')
  @ApiOperation({ summary: 'Add or update a response (upsert)' })
  addResponse(@Body() dto: CreateResponseDto) { return this.service.addResponse(dto); }

  @Put(':id/status')
  @ApiOperation({ summary: 'Submit / review / approve inspection' })
  submit(@Param('id') id: string, @Body() dto: SubmitInspectionDto) { return this.service.submit(id, dto); }
}