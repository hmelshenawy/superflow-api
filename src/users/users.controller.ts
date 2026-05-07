import { Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ADMIN_USERS, ADMIN_USERS_CREATE, ADMIN_USERS_DELETE } from '../common/permissions';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermission(ADMIN_USERS)
  @ApiOperation({ summary: 'List staff (scoped to workshop)' })
  findAll(@Request() req: any, @Query() pagination: PaginationDto) {
    const user = req.user;
    return this.service.findAll(pagination, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission(ADMIN_USERS_CREATE)
  @ApiOperation({ summary: 'Create staff account' })
  create(@Request() req: any, @Body() dto: CreateUserDto) {
    const user = req.user;
    return this.service.create(dto, user);
  }

  @Post('invite')
  @RequirePermission(ADMIN_USERS_CREATE)
  @ApiOperation({ summary: 'Invite/create staff account' })
  invite(@Request() req: any, @Body() dto: CreateUserDto) {
    const user = req.user;
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @RequirePermission(ADMIN_USERS)
  @ApiOperation({ summary: 'Update user' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto, req.user);
  }

  @Post(':id/reset-password')
  @RequirePermission(ADMIN_USERS_DELETE)
  @ApiOperation({ summary: 'Admin reset a user password' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto.newPassword);
  }

  @Delete(':id')
  @RequirePermission(ADMIN_USERS_DELETE)
  @ApiOperation({ summary: 'Deactivate user (soft delete)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
