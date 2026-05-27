import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { captureSentryError } from '../sentry/sentry.capture';
import { AppException, ErrorCode } from '../errors/app-errors';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'AUTH_TOKEN_INVALID',
  [HttpStatus.FORBIDDEN]: 'AUTH_FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYMENT_REQUIRED]: 'AUTH_TRIAL_EXPIRED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

function inferCode(status: number, exceptionResponse: any): ErrorCode {
  if (exceptionResponse?.error === 'Plan Feature Required') return 'PLAN_FEATURE_REQUIRED';
  if (exceptionResponse?.error === 'Plan Limit Reached') return 'PLAN_LIMIT_REACHED';
  if (status === HttpStatus.UNAUTHORIZED && /token/i.test(String(exceptionResponse?.message ?? ''))) return 'AUTH_TOKEN_EXPIRED';
  return STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      captureSentryError(exception, {
        method: request.method,
        path: request.originalUrl || request.url,
      });
    }

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    let message: string;
    let code: ErrorCode;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof AppException) {
      code = exception.code;
      details = exception.details;
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || exception.message;
    } else if (exception instanceof HttpException) {
      const resp = exceptionResponse as any;
      message = typeof resp === 'string' ? resp : Array.isArray(resp?.message) ? resp.message.join('; ') : (resp?.message || 'Request failed');
      code = inferCode(status, resp);
    } else {
      message = 'Internal server error';
      code = 'INTERNAL_ERROR';
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      ...(details && { details }),
      method: request.method,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    });
  }
}