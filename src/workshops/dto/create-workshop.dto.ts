import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEmail, IsArray, IsIn } from 'class-validator';
import { PRODUCT_MODES, ProductMode, ModuleKey } from '../../common/product-modes';

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
