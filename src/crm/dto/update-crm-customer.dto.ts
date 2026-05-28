import { IsString, IsOptional, IsEmail, IsArray, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const LEAD_SOURCES = ['walk-in', 'referral', 'online', 'dms', 'other'] as const;
const PREFERRED_CONTACT = ['phone', 'email', 'whatsapp', 'sms'] as const;

export class UpdateCrmCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(PREFERRED_CONTACT) preferred_contact?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(LEAD_SOURCES) lead_source?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}