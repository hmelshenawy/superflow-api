import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartFitmentDto {
  @ApiProperty({ description: 'Vehicle make / brand, e.g. Mercedes-Benz' })
  @IsString()
  make: string;

  @ApiPropertyOptional({ description: 'Vehicle model, e.g. C-Class' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Variant / chassis / trim, e.g. W205 C200' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ description: 'Engine or drivetrain note, e.g. M274 2.0L' })
  @IsOptional()
  @IsString()
  engine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year_from?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year_to?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePartFitmentDto extends CreatePartFitmentDto {}
