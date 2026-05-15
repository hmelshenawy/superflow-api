import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoItemDto {
  @ApiProperty() @IsString() part_id: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) ordered_qty: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unit_cost?: number;
}