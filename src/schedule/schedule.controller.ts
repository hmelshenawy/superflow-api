import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RequireModule, MODULE_KEYS } from '../common/product-modes';
import { WorkshopScheduleService } from './schedule.service';
import { CreateBreakDto } from './dto/create-break.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpsertScheduleDayDto } from './dto/upsert-schedule-day.dto';

@ApiTags('Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireModule(MODULE_KEYS.APPOINTMENTS)
@Controller('schedule')
export class ScheduleController {
  constructor(private service: WorkshopScheduleService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Put('days/:dayOfWeek')
  upsertDay(@Param('dayOfWeek') dayOfWeek: string, @Body() dto: UpsertScheduleDayDto) { return this.service.upsertDay(Number(dayOfWeek), dto); }

  @Post('breaks')
  createBreak(@Body() dto: CreateBreakDto) { return this.service.createBreak(dto); }

  @Delete('breaks/:id')
  deleteBreak(@Param('id') id: string) { return this.service.deleteBreak(id); }

  @Post('holidays')
  createHoliday(@Body() dto: CreateHolidayDto) { return this.service.createHoliday(dto); }

  @Delete('holidays/:id')
  deleteHoliday(@Param('id') id: string) { return this.service.deleteHoliday(id); }

  @Get('slots')
  slots(@Query('date') date: string, @Query('staff_id') staffId?: string) { return this.service.slots(date, staffId); }
}
