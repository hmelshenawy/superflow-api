import { IsDateString, IsOptional } from 'class-validator';

export class QueryAppointmentsDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}
