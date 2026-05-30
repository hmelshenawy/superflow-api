import { IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateJobTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsInt()
  @Min(1)
  duration_min: number;

  @IsHexColor()
  color_hex: string;

  @IsOptional()
  @IsString()
  description?: string;
}
