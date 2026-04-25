import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => !o.refresh_token)
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !o.refreshToken)
  @IsString()
  @IsNotEmpty()
  refresh_token?: string;
}
