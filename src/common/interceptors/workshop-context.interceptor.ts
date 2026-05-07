import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import { workshopContext, WorkshopContext } from '../../prisma/workshop-context';

@Injectable()
export class WorkshopContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const ctx: WorkshopContext = {
      workshopId: user.workshopId ?? null,
      isPlatformAdmin: user.role === 'platform_admin',
    };

    return new Observable((subscriber: Subscriber<any>) => {
      workshopContext.run(ctx, () => {
        next.handle().subscribe({
          next(val) { subscriber.next(val); },
          error(err) { subscriber.error(err); },
          complete() { subscriber.complete(); },
        });
      });
    });
  }
}