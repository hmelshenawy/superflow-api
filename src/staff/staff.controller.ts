import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RequireModule, MODULE_KEYS } from '../common/product-modes';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequireModule(MODULE_KEYS.APPOINTMENTS)
@Controller('staff')
export class StaffController {
  constructor(private service: StaffService) {}

  @Get()
  findAll(@Query('is_active') isActive?: string) { return this.service.findAll(isActive); }

  @Post()
  create(@Body() dto: CreateStaffDto) { return this.service.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get(':id/leaves')
  leaves(@Param('id') id: string) { return this.service.leaves(id); }

  @Post(':id/leaves')
  createLeave(@Param('id') id: string, @Body() dto: CreateLeaveDto) { return this.service.createLeave(id, dto); }

  @Delete(':id/leaves/:leaveId')
  deleteLeave(@Param('id') id: string, @Param('leaveId') leaveId: string) { return this.service.deleteLeave(id, leaveId); }
}
