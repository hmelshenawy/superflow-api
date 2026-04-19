import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const path = request.route?.path;

    if (!user || method === 'GET') return next.handle();

    return next.handle().pipe(
      tap(async (data) => {
        await this.prisma.audit_logs.create({
          data: {
            id: uuid(),
            user_id: user.sub,
            entity_type: path?.split('/')[2] || 'unknown',
            entity_id: data?.id || null,
            action: method,
            new_values: data ? JSON.stringify(data) : null,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
          },
        }).catch(() => {}); // silent fail — audit should never break the request
      }),
    );
  }
}