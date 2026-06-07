import { Controller, Get, Post, Param, Query, Body, Request, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TechniciansService } from './technicians.service';
import { ClockEventDto, TechnicianProductivityQueryDto } from './dto/technician.dto';
import { JwtAuthGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RequirePermission, TECHNICIAN_BOARD, TECHNICIAN_CLOCK, TECHNICIAN_PRODUCTIVITY } from '@common/permissions';

@ApiTags('Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('technicians')
export class TechniciansController {
  private readonly logger = new Logger(TechniciansController.name);
  constructor(private service: TechniciansService) {}

  @Get('board')
  @RequirePermission(TECHNICIAN_BOARD)
  @ApiOperation({ summary: 'Get technician board — all techs with their assigned jobs' })
  async getBoard(@Query('date') date?: string) {
    try {
      return await this.service.getBoard(date);
    } catch (err: any) {
      this.logger.error(`Failed to load technician board: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  @Get(':id/productivity')
  @RequirePermission(TECHNICIAN_PRODUCTIVITY)
  @ApiOperation({ summary: 'Get technician productivity metrics' })
  getProductivity(@Param('id') id: string, @Query() query: TechnicianProductivityQueryDto) {
    return this.service.getProductivity(id, query);
  }

  @Get(':id/clock-status')
  @RequirePermission(TECHNICIAN_BOARD)
  @ApiOperation({ summary: 'Get technician current clock status' })
  getClockStatus(@Param('id') id: string) {
    return this.service.getClockStatus(id);
  }

  @Post('clock')
  @RequirePermission(TECHNICIAN_CLOCK)
  @ApiOperation({ summary: 'Record a clock event (clock in/out, break start/end)' })
  clockEvent(@Request() req: any, @Body() dto: ClockEventDto) {
    return this.service.clockEvent(dto, req.user?.userId);
  }
}