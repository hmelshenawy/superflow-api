import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstimatesService } from './estimates.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Estimates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('estimates')
export class EstimatesController {
  constructor(private service: EstimatesService) {}

  @Get('job/:jobId')
  @ApiOperation({ summary: 'List estimate lines for a job' })
  findByJob(@Param('jobId') jobId: string) { return this.service.findByJob(jobId); }

  @Get()
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateLineDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLineDto, @CurrentUser('sub') userId: string) { return this.service.update(id, dto, userId); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Put('job/:jobId/bulk')
  @ApiOperation({ summary: 'Bulk replace all estimate lines for a job' })
  bulkReplace(
    @Param('jobId') jobId: string,
    @Body() body: { lines: any[] },
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.bulkReplace(jobId, body.lines, userId);
  }
}