import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;

    if (context.getType() !== 'http' || method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next.handle();
    }

    const entityType = this.resolveEntityType(request);
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const oldValues = undefined;
    const requestBody = request.body;

    return next.handle().pipe(
      tap(async (data) => {
        await this.auditService.createLog({
          userId: user?.sub,
          entityType,
          entityId: data?.id || request.params?.id || null,
          action: method,
          oldValues,
          newValues: { request: requestBody, response: data },
          ipAddress: ip,
          userAgent,
        }).catch(() => {});
      }),
    );
  }

  private resolveEntityType(request: any) {
    const baseUrl = String(request.baseUrl || '').replace(/^\/api\//, '').replace(/^\//, '');
    if (baseUrl) return baseUrl;

    const originalUrl = String(request.originalUrl || '').replace(/^\/api\//, '').replace(/^\//, '');
    const [first] = originalUrl.split('/');
    return first || 'unknown';
  }
}
