import { IsString, IsOptional, IsInt, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty() @IsString() customer_id: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(17) @MaxLength(17) vin?: string;
  @ApiProperty() @IsString() make: string;
  @ApiProperty() @IsString() model: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() plate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometer_km?: number;
  @ApiPropertyOptional() @IsOptional() vehicle_type?: 'sedan' | 'suv' | 'coupe' | 'hatchback' | 'convertible' | 'pickup' | 'van' | 'truck' | 'motorcycle' | 'other';
  @ApiPropertyOptional() @IsOptional() @IsString() engine?: string;
}