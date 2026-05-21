import { IsString, IsOptional } from 'class-validator';

export class CreateChecklistDto {
  @IsString()
  jobId: string;

  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  checkerId?: string;
}