import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivePoItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) received_qty: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warehouse_id?: string;
}