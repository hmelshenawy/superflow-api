import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateLeaveDto {
  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
