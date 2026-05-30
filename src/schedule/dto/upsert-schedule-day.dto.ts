import { IsBoolean, IsInt, IsOptional, Matches, Min } from 'class-validator';

export class UpsertScheduleDayDto {
  @IsOptional()
  @IsBoolean()
  is_open?: boolean;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be HH:MM' })
  open_time: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Time must be HH:MM' })
  close_time: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slot_duration_min?: number;
}
