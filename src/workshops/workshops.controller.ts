import { Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import { WORKSHOPS_READ, WORKSHOPS_CREATE, WORKSHOPS_UPDATE, WORKSHOPS_DELETE, WORKSHOPS_ASSIGN_USERS } from '../common/permissions/permissions';

@ApiTags('Workshops')
@Controller('workshops')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkshopsController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  @RequirePermission(WORKSHOPS_READ)
  @ApiOperation({ summary: 'List workshops the user has access to' })
  findAll(@Request() req: any) {
    const user = req.user;
    if (user.role === 'platform_admin') {
      return this.workshops.findAll();
    }
    return this.workshops.findAllForUser(user.sub);
  }

  @Post()
  @RequirePermission(WORKSHOPS_CREATE)
  @ApiOperation({ summary: 'Create a workshop' })
  create(@Body() dto: CreateWorkshopDto) {
    return this.workshops.create(dto);
  }

  @Get(':id')
  @RequirePermission(WORKSHOPS_READ)
  @ApiOperation({ summary: 'Get workshop details' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const user = req.user;
    if (user.role !== 'platform_admin') {
      await this.workshops.verifyUserAccess(id, user.sub);
    }
    return this.workshops.findOne(id);
  }

  @Patch(':id')
  @RequirePermission(WORKSHOPS_UPDATE)
  @ApiOperation({ summary: 'Update a workshop' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWorkshopDto) {
    const user = req.user;
    if (user.role !== 'platform_admin') {
      await this.workshops.verifyUserAccess(id, user.sub);
    }
    return this.workshops.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(WORKSHOPS_DELETE)
  @ApiOperation({ summary: 'Soft-delete a workshop' })
  remove(@Param('id') id: string) {
    return this.workshops.remove(id);
  }

  @Get(':id/export')
  @RequirePermission(WORKSHOPS_READ)
  @ApiOperation({ summary: 'Export workshop data as JSON (platform admin only)' })
  exportData(@Request() req: any, @Param('id') id: string) {
    if (req.user?.role !== 'platform_admin') {
      throw new ForbiddenException('Workshop export is only available to platform administrators');
    }
    return this.workshops.exportData(id);
  }

  @Get(':id/users')
  @RequirePermission(WORKSHOPS_READ)
  @ApiOperation({ summary: 'List users assigned to a workshop' })
  async getWorkshopUsers(@Request() req: any, @Param('id') id: string) {
    const user = req.user;
    if (user.role !== 'platform_admin') {
      await this.workshops.verifyUserAccess(id, user.sub);
    }
    return this.workshops.getWorkshopUsers(id);
  }

  @Post(':id/users')
  @RequirePermission(WORKSHOPS_ASSIGN_USERS)
  @ApiOperation({ summary: 'Assign user to workshop' })
  async assignUser(@Request() req: any, @Param('id') id: string, @Body() dto: AssignUserDto) {
    const user = req.user;
    if (user.role !== 'platform_admin') {
      await this.workshops.verifyUserAccess(id, user.sub);
    }
    return this.workshops.assignUser(id, dto.userId);
  }

  @Delete(':id/users/:userId')
  @RequirePermission(WORKSHOPS_ASSIGN_USERS)
  @ApiOperation({ summary: 'Remove user from workshop' })
  async removeUser(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    const user = req.user;
    if (user.role !== 'platform_admin') {
      await this.workshops.verifyUserAccess(id, user.sub);
    }
    return this.workshops.removeUser(id, userId);
  }
}
