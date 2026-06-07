import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ImportJobTypesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  template_ids: string[];
}
