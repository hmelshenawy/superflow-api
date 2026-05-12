import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlockersService } from './blockers.service';
import { CreateBlockerDto, ResolveBlockerDto } from './dto/create-blocker.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, BLOCKERS_READ, BLOCKERS_MANAGE } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Blockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('blockers')
export class BlockersController {
  constructor(private service: BlockersService) {}

  @Get()
  @RequirePermission(BLOCKERS_READ)
  @ApiOperation({ summary: 'List blockers with optional filters' })
  findAll(
    @Query('status') status?: string,
    @Query('job_id') job_id?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.service.findAll(
      { status, job_id, type, severity },
      Number(page),
      Number(limit),
    );
  }

  @Get('summary')
  @RequirePermission(BLOCKERS_READ)
  @ApiOperation({ summary: 'Get blocked jobs summary with counts by severity and type' })
  getBlockedJobsSummary() {
    return this.service.getBlockedJobsSummary();
  }

  @Get(':id')
  @RequirePermission(BLOCKERS_READ)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission(BLOCKERS_MANAGE)
  @ApiOperation({ summary: 'Create a blocker on a job' })
  create(@Body() dto: CreateBlockerDto, @CurrentUser('sub') userId: string) {
    return this.service.create(dto, userId);
  }

  @Patch(':id/resolve')
  @RequirePermission(BLOCKERS_MANAGE)
  @ApiOperation({ summary: 'Resolve a blocker with an optional note' })
  resolve(@Param('id') id: string, @Body() dto: ResolveBlockerDto, @CurrentUser('sub') userId: string) {
    return this.service.resolve(id, userId, dto);
  }

  @Delete(':id')
  @RequirePermission(BLOCKERS_MANAGE)
  @ApiOperation({ summary: 'Dismiss a blocker (mark as dismissed)' })
  dismiss(@Param('id') id: string) {
    return this.service.dismiss(id);
  }
}