import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export enum StaffRoleDto {
  advisor = 'advisor',
  technician = 'technician',
  both = 'both',
}

export class CreateStaffDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsEnum(StaffRoleDto)
  role: StaffRoleDto;

  @IsArray()
  @IsInt({ each: true })
  working_days: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  max_concurrent_jobs?: number;
}
