import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import { PARTS_READ } from '../common/permissions/permissions';
import { StockMovementsService } from './stock-movements.service';
import { ListMovementsDto } from './dto/list-movements.dto';

@ApiTags('Stock Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get()
  @RequirePermission(PARTS_READ)
  @ApiOperation({ summary: 'List stock movements' })
  findAll(@Query() query: ListMovementsDto) {
    return this.service.findAll(query);
  }

  @Get('part/:partId')
  @RequirePermission(PARTS_READ)
  @ApiOperation({ summary: 'Get stock movements for a part' })
  getByPart(@Param('partId') partId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.getByPart(partId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }
}