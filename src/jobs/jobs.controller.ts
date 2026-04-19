import { Controller, Get, Post, Put, Param, Body, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private service: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs, optional ?status= filter' })
  findAll(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    return this.service.findAll(pagination, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateJobDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) { return this.service.update(id, dto); }

  @Put(':id/status')
  @ApiOperation({ summary: 'Transition job status (state machine)' })
  transition(@Param('id') id: string, @Body() dto: TransitionStatusDto, @CurrentUser('sub') userId: string) {
    return this.service.transition(id, dto, userId);
  }
}