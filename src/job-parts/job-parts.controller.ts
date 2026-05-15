import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  JOB_PARTS_READ,
  JOB_PARTS_RESERVE,
  JOB_PARTS_CONSUME,
  JOB_PARTS_RETURN,
} from '../common/permissions/permissions';
import { JobPartsService } from './job-parts.service';
import { ReservePartDto } from './dto/reserve-part.dto';
import { ConsumePartDto } from './dto/consume-part.dto';
import { ReturnPartDto } from './dto/return-part.dto';

@ApiTags('Job Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('job-parts')
export class JobPartsController {
  constructor(private readonly service: JobPartsService) {}

  @Post('reserve')
  @RequirePermission(JOB_PARTS_RESERVE)
  @ApiOperation({ summary: 'Reserve a part for a job' })
  reserveForJob(@Body() dto: ReservePartDto, @CurrentUser('sub') userId: string) {
    return this.service.reserveForJob(dto, userId);
  }

  @Post('consume')
  @RequirePermission(JOB_PARTS_CONSUME)
  @ApiOperation({ summary: 'Consume a reserved part for a job' })
  consumeForJob(@Body() dto: ConsumePartDto, @CurrentUser('sub') userId: string) {
    return this.service.consumeForJob(dto.job_part_id, userId, dto.quantity);
  }

  @Post('return')
  @RequirePermission(JOB_PARTS_RETURN)
  @ApiOperation({ summary: 'Return a reserved part from a job' })
  returnForJob(@Body() dto: ReturnPartDto, @CurrentUser('sub') userId: string) {
    return this.service.returnForJob(dto.job_part_id, userId, dto.quantity);
  }

  @Post(':id/cancel')
  @RequirePermission(JOB_PARTS_RETURN)
  @ApiOperation({ summary: 'Cancel a part reservation' })
  cancelReservation(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.cancelReservation(id, userId);
  }

  @Get('job/:jobId')
  @RequirePermission(JOB_PARTS_READ)
  @ApiOperation({ summary: 'Get parts for a job' })
  getByJob(@Param('jobId') jobId: string) {
    return this.service.getByJob(jobId);
  }
}