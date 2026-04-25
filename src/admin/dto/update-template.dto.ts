import { PartialType } from '@nestjs/swagger';
import { CreateAdminTemplateDto } from './create-template.dto';

export class UpdateAdminTemplateDto extends PartialType(CreateAdminTemplateDto) {}
