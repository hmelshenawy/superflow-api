import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { captureSentryError } from '../sentry/sentry.capture';

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
      console.error(`[500 Error] ${request.method} ${request.originalUrl || request.url}`, exception instanceof Error ? exception.message : String(exception), exception instanceof Error ? exception.stack?.slice(0, 500) : '');
      captureSentryError(exception, {
        method: request.method,
        path: request.originalUrl || request.url,
      });
    }

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;
    const message = exceptionResponse
      ? (typeof exceptionResponse === 'string' ? exceptionResponse : (exceptionResponse as any).message || exceptionResponse)
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      method: request.method,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
