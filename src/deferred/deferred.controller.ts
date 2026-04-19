import { Controller, Get, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeferredService } from './deferred.service';
import { UpdateDeferredDto } from './dto/update-deferred.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@ApiTags('Deferred Work')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deferred')
export class DeferredController {
  constructor(private service: DeferredService) {}

  @Get()
  @ApiOperation({ summary: 'List deferred work, optional ?status= filter' })
  findAll(@Query() pagination: PaginationDto, @Query('status') status?: string) { return this.service.findAll(pagination, status); }

  @Get('reminders')
  @ApiOperation({ summary: 'Get deferred items due for reminder' })
  getDueReminders() { return this.service.getDueReminders(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeferredDto) { return this.service.update(id, dto); }
}