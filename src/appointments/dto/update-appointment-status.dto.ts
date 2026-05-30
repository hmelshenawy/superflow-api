import { IsEnum } from 'class-validator';

export enum AppointmentStatusDto {
  waiting = 'waiting',
  in_progress = 'in_progress',
  on_hold = 'on_hold',
  done = 'done',
  cancelled = 'cancelled',
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatusDto)
  status: AppointmentStatusDto;
}
