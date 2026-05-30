import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateBreakDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be HH:MM' })
  start_time: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be HH:MM' })
  end_time: string;

  @IsOptional()
  @IsString()
  label?: string;
}
