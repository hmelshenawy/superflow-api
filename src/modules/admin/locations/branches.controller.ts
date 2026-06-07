import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import {
  INVOICES_CREATE,
  INVOICES_READ,
  INVOICES_UPDATE,
} from '../../../common/permissions/permissions';
import { WorkshopsService } from './workshops.service';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private workshops: WorkshopsService) {}

  @Get()
  @RequirePermission(INVOICES_READ, INVOICES_CREATE, INVOICES_UPDATE)
  @ApiOperation({ summary: 'List branches for the current workshop' })
  findAll() {
    return this.workshops.findBranches();
  }
}
