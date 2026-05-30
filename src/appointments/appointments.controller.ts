import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RequireModule, MODULE_KEYS } from '../common/product-modes';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireModule(MODULE_KEYS.APPOINTMENTS)
@Controller('appointments')
export class AppointmentsController {
  constructor(private service: AppointmentsService) {}

  @Get()
  findAll(@Query() query: QueryAppointmentsDto) { return this.service.findAll(query); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Request() req: any, @Body() dto: CreateAppointmentDto) { return this.service.create(dto, req.user?.sub); }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) { return this.service.updateStatus(id, dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
