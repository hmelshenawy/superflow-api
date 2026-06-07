import { IsOptional, IsString } from 'class-validator';

export class SubmitChecklistDto {
  @IsOptional()
  @IsString()
  notes?: string;
}