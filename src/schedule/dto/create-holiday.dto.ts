import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  is_full_day?: boolean;
}
