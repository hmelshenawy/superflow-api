import { SetMetadata } from '@nestjs/common';
import { ModuleKey } from './product-mode.config';

export const REQUIRED_MODULE_KEY = 'requiredProductModule';

export const RequireModule = (moduleKey: ModuleKey) => SetMetadata(REQUIRED_MODULE_KEY, moduleKey);
