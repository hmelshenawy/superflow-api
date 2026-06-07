import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RequestAuthorisationDto {
  @ApiPropertyOptional({ enum: ['link', 'email', 'sms', 'whatsapp'] })
  @IsOptional()
  @IsEnum(['link', 'email', 'sms', 'whatsapp'])
  channel?: 'link' | 'email' | 'sms' | 'whatsapp';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sentTo?: string;
}
