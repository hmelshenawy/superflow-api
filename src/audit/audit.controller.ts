import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs, filter by ?entityType= & userId=' })
  findAll(@Query() pagination: PaginationDto, @Query('entityType') entityType?: string, @Query('userId') userId?: string) {
    return this.service.findAll(pagination, entityType, userId);
  }
}