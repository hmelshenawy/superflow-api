import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumePartDto {
  @ApiProperty() @IsString() job_part_id: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() quantity?: number;
}