import { Body, Controller, Get, Patch, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeferredService } from './deferred.service';
import { UpdateDeferredDto } from './dto/update-deferred.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, DEFERRED_READ, DEFERRED_MANAGE, DEFERRED_BOOK } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Deferred Work')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('deferred')
export class DeferredController {
  constructor(private service: DeferredService) {}

  @Get()
  @RequirePermission(DEFERRED_READ)
  @ApiOperation({ summary: 'List all deferred work, optional ?status=' })
  findAll(@Query('page') page = '1', @Query('limit') limit = '20', @Query('status') status?: string) {
    return this.service.findAll({ page: Number(page), limit: Number(limit) } as PaginationDto, status);
  }

  @Get('reminders')
  @RequirePermission(DEFERRED_READ)
  @ApiOperation({ summary: 'Get deferred items due for reminder' })
  getDueReminders() { return this.service.getDueReminders(); }

  @Get(':id')
  @RequirePermission(DEFERRED_READ)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post(':id/remind')
  @RequirePermission(DEFERRED_MANAGE)
  @ApiOperation({ summary: 'Send reminder now' })
  remind(@Param('id') id: string) { return this.service.remindNow(id); }

  @Patch(':id')
  @RequirePermission(DEFERRED_MANAGE)
  @ApiOperation({ summary: 'Update deferred work status/details' })
  update(@Param('id') id: string, @Body() dto: UpdateDeferredDto) { return this.service.update(id, dto); }

  @Post(':id/book')
  @RequirePermission(DEFERRED_BOOK)
  @ApiOperation({ summary: 'Convert deferred work to a new job' })
  book(@Param('id') id: string, @CurrentUser('sub') advisorId: string) { return this.service.book(id, advisorId); }
}