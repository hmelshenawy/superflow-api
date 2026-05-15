import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export const MOVEMENT_TYPES = [
  'purchase_in', 'job_reserve', 'job_consume', 'job_return',
  'adjustment_in', 'adjustment_out', 'transfer_in', 'transfer_out',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export class ListMovementsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() part_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouse_id?: string;
  @ApiPropertyOptional({ enum: MOVEMENT_TYPES }) @IsOptional() @IsEnum(MOVEMENT_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() date_from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() date_to?: string;
}