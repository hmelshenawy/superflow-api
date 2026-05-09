import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Legacy body refresh token. Prefer the HttpOnly refresh cookie.' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Legacy snake_case body refresh token. Prefer the HttpOnly refresh cookie.' })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
