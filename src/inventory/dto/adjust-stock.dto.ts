import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const ADJUSTMENT_TYPES = ['adjustment_in', 'adjustment_out'] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export class AdjustStockDto {
  @ApiProperty() @IsString() part_id: string;
  @ApiProperty() @IsString() warehouse_id: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiProperty({ enum: ADJUSTMENT_TYPES }) @IsEnum(ADJUSTMENT_TYPES) type: AdjustmentType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unit_cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}