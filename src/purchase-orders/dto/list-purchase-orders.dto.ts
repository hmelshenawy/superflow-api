import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export const PO_STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'] as const;
export type PoStatus = (typeof PO_STATUSES)[number];

export class ListPurchaseOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PO_STATUSES }) @IsOptional() @IsEnum(PO_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier_id?: string;
}