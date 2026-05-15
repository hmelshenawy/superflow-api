import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReservePartDto {
  @ApiProperty() @IsString() job_id: string;
  @ApiProperty() @IsString() part_id: string;
  @ApiProperty() @IsString() warehouse_id: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unit_cost?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unit_price?: number;
}