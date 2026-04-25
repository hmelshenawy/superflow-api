import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignTechnicianDto {
  @ApiProperty()
  @IsString()
  technician_id!: string;
}
