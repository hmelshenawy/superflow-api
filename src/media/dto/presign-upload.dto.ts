import { IsString, IsOptional, IsEnum, Matches, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|mp4|mov|webm|pdf|docx?|xlsx?)$/i;

export class PresignUploadDto {
  @ApiProperty() @IsString() job_id: string;
  @ApiProperty() @IsEnum(['photo','video','document']) file_type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inspection_response_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() concern_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() inspection_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() item_id?: string;
  @ApiProperty() @IsString() @Matches(ALLOWED_EXTENSIONS, { message: 'File extension not allowed' }) filename: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mime_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) size_bytes?: number;
}
