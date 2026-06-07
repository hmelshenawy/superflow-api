import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  staff_id: string;

  @IsDateString()
  start_time: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_min?: number;

  @IsOptional()
  @IsString()
  job_type_id?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  work_order_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
