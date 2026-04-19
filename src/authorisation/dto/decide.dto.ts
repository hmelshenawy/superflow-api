import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DecideDto {
  @ApiProperty() @IsString() token_id: string;
  @ApiProperty() @IsString() estimate_line_id: string;
  @ApiProperty() @IsEnum(['approved','declined','deferred']) decision: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_comment?: string;
}