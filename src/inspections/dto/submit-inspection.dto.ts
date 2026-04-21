import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitInspectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  advisor_note?: string;
}
