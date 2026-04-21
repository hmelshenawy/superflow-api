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
  @ApiOperation({ summary: 'Get inspection + responses' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Start inspection session' })
  create(@Body() body: { jobId: string; templateId: string }, @CurrentUser('sub') userId: string) {
    return this.service.create(body.jobId, body.templateId, userId);
  }

  @Put(':id/responses')
  @ApiOperation({ summary: 'Save answers in batch, supports offline draft payload' })
  saveResponses(@Param('id') id: string, @Body() dto: CreateResponseDto) {
    return this.service.saveResponses(id, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Lock and finalize inspection, queues advisor alert' })
  submit(@Param('id') id: string, @Body() dto: SubmitInspectionDto, @CurrentUser('sub') userId: string) {
    return this.service.submit(id, dto, userId);
  }
}
