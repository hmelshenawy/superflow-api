import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StaffRoleDto } from './create-staff.dto';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(StaffRoleDto)
  role?: StaffRoleDto;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  working_days?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  max_concurrent_jobs?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
