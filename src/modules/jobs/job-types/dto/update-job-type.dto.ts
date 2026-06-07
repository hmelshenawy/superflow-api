import { IsBoolean, IsHexColor, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateJobTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_min?: number;

  @IsOptional()
  @IsHexColor()
  color_hex?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
