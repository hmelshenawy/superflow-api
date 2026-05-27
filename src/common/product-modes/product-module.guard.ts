import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenError } from '../errors/app-errors';
import { REQUIRED_MODULE_KEY } from './require-module.decorator';
import {
  ModuleKey,
  isModuleEnabled,
  normalizeProductMode,
  parseEnabledModules,
  PRODUCT_MODE_DISPLAY_NAMES,
} from './product-mode.config';

@Injectable()
export class ProductModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<ModuleKey>(REQUIRED_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role === 'platform_admin') return true;

    const workshopId = user.workshopId;
    if (!workshopId) throw new ForbiddenError('No workshop selected.');

    const workshop = await this.prisma.raw.workshops.findUnique({
      where: { id: workshopId },
      select: {
        product_mode: true,
        enabled_modules: true,
        package_name: true,
      } as any,
    } as any);

    const productMode = normalizeProductMode((workshop as any)?.product_mode);
    const enabledModules = parseEnabledModules((workshop as any)?.enabled_modules, productMode);

    if (!isModuleEnabled(productMode, enabledModules, requiredModule)) {
      throw new ForbiddenError('Feature not available in your product.', {
        module: requiredModule,
        productMode,
        product: (workshop as any)?.package_name || PRODUCT_MODE_DISPLAY_NAMES[productMode],
      });
    }

    return true;
  }
}
