import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InspectionResponseItemDto {
  @ApiProperty() @IsString() item_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() value?: string;
  @ApiPropertyOptional() @IsOptional() urgency?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  @ApiPropertyOptional() @IsOptional() @IsString() tech_notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() media_count?: number;
}

export class CreateResponseDto {
  @ApiProperty({ type: [InspectionResponseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionResponseItemDto)
  responses: InspectionResponseItemDto[];

  @ApiPropertyOptional({ description: 'Optional offline draft payload for mobile/offline support' })
  @IsOptional()
  @IsObject()
  offline_draft?: Record<string, unknown>;
}
