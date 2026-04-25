import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

function convertBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(convertBigInt);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertBigInt(val);
    }
    return result;
  }
  return value;
}

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => convertBigInt(data)));
  }
}