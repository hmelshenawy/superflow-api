import { IsString, IsOptional, IsBoolean, IsEmail, IsArray, IsIn } from 'class-validator';
import { PRODUCT_MODES, ProductMode, ModuleKey } from '../../common/product-modes';

export class UpdateWorkshopDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn([PRODUCT_MODES.WORKSHOP, PRODUCT_MODES.CONNECT])
  productMode?: ProductMode;

  @IsOptional()
  @IsBoolean()
  dmsIntegrationEnabled?: boolean;

  @IsOptional()
  @IsArray()
  enabledModules?: ModuleKey[];

  @IsOptional()
  @IsString()
  packageName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
