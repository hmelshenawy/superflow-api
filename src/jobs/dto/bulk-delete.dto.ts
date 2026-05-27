import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteJobsDto {
  @ApiProperty({ example: true, description: 'Must explicitly confirm bulk deletion' })
  confirm: boolean;

  @ApiProperty({ example: ['job_status_booked'], description: 'Optional filter: only delete jobs with these statuses' })
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];
}