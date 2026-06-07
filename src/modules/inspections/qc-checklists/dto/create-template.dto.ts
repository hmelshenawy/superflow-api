import { IsString, IsOptional } from 'class-validator';

export class CreateQcTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}