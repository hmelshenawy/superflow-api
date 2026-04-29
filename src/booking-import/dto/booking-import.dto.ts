import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * A single column mapping: which source column maps to which target field.
 */
export class ColumnMappingDto {
  @ApiProperty({ description: 'Header name from the uploaded file' })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Target field in SuperFlow',
    enum: [
      // Customer fields
      'customer_name', 'customer_email', 'customer_phone',
      // Vehicle fields
      'vehicle_make', 'vehicle_model', 'vehicle_plate', 'vehicle_vin',
      // Job fields
      'job_number', 'advisor_id', 'customer_concern', 'promised_at', 'dms_ro_number',
      // Ignored
      '_ignore',
    ],
  })
  @IsString()
  target: string;
}

/**
 * Save a template for reuse.
 */
export class SaveTemplateDto {
  @ApiProperty() @IsString() name: string;

  @ApiProperty({ description: 'Column mappings: source header → target field' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
  mappings: ColumnMappingDto[];
}

/**
 * Run the import with a template and file data.
 */
export class RunImportDto {
  @ApiPropertyOptional({ description: 'Template ID to use (if saved previously)' })
  @IsOptional() @IsString() template_id?: string;

  @ApiPropertyOptional({
    description: 'Inline column mappings (overrides template if both provided)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
  mappings?: ColumnMappingDto[];

  @ApiProperty({ description: 'Rows from the parsed file (array of objects keyed by header name)' })
  @IsArray()
  @IsObject({ each: true })
  rows: Record<string, string>[];
}