import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() plate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() odometer_km?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() engine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customer_id?: string;
}