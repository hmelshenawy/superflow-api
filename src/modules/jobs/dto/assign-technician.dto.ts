import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignTechnicianDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  technician_id?: string | null;
}
