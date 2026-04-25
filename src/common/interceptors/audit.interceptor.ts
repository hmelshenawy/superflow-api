import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

const SENSITIVE_KEYS = [
  'password',
  'confirmPassword',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
  'set-cookie',
  'x-api-key',
];

function redactSensitive(value: any): any {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s.toLowerCase()));
        return [key, isSensitive ? '[REDACTED]' : redactSensitive(val)];
      }),
    );
  }

  return value;
}

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
    const path = String(request.originalUrl || request.url || '');
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];
    const oldValues = undefined;
    const isAuthEndpoint = /^\/api\/auth\/(login|refresh|register)$/i.test(path);
    const requestBody = isAuthEndpoint
      ? '[REDACTED]'
      : redactSensitive(request.body);

    return next.handle().pipe(
      tap(async (data) => {
        const responseBody = isAuthEndpoint ? '[REDACTED]' : redactSensitive(data);
        await this.auditService.createLog({
          userId: user?.sub,
          entityType,
          entityId: data?.id || request.params?.id || null,
          action: method,
          oldValues,
          newValues: {
            method,
            path,
            userId: user?.sub || null,
            status: 'success',
            request: requestBody,
            response: responseBody,
          },
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
