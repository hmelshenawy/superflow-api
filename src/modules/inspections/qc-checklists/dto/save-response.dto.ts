import { IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QcResponseItemDto {
  @IsString()
  item_id: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  media_count?: number;
}

export class SaveResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QcResponseItemDto)
  responses: QcResponseItemDto[];
}