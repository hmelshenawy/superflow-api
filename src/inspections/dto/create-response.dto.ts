import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResponseDto {
  @ApiProperty() @IsString() inspection_id: string;
  @ApiProperty() @IsString() item_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() value?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(['none','low','medium','high','critical']) urgency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tech_notes?: string;
  @ApiPropertyOptional() @IsOptional() media_count?: number;
}