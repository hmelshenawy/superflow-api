import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PresignUploadDto {
  @ApiProperty() @IsString() job_id: string;
  @ApiProperty() @IsEnum(['photo','video','document']) file_type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inspection_response_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inspection_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() item_id?: string;
  @ApiProperty() @IsString() filename: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mime_type?: string;
}