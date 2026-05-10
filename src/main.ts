import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { initSentry } from './common/sentry/sentry.init';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// ─── Initialize Sentry before anything else ─────────────────
initSentry();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.set('trust proxy', 1);
  httpAdapter.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );

  // ─── Sentry request handler (must be before other middleware) ──
  Sentry.setupExpressErrorHandler(app.getHttpAdapter().getInstance());

  // ─── Helmet + CSP (report-only for now) ──────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            // Next.js needs inline scripts for hydration
            "'unsafe-inline'",
            "'unsafe-eval'",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            // Next.js styled-jsx / Tailwind
          ],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: [
            "'self'",
            // Sentry ingestion
            'https://*.ingest.sentry.io',
          ],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
        // Report-only: violations logged but NOT blocked
        // Once we verify no false positives, switch to enforcement
        reportOnly: true,
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Health check
  app.use('/health', (_req: Request, res: Response) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(app.get(AuditInterceptor));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger docs only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SuperFlow API')
      .setDescription('Workshop Management System')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 SuperFlow API running on http://localhost:${port}/api`);
}
bootstrap();
