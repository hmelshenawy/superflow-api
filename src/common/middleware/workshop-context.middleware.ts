import { Injectable, NestMiddleware } from '@nestjs/common';
import { setWorkshopContext } from '../../prisma/workshop-context';

@Injectable()
export class WorkshopContextMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const user = req.user;
    if (user) {
      setWorkshopContext(
        {
          workshopId: user.workshopId ?? null,
          isPlatformAdmin: user.role === 'platform_admin' || user.role === 'admin',
        },
        next,
      );
    } else {
      next();
    }
  }
}