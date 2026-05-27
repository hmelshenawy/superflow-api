import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferStockDto {
  @ApiProperty() @IsString() part_id: string;
  @ApiProperty() @IsString() from_warehouse_id: string;
  @ApiProperty() @IsString() to_warehouse_id: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}