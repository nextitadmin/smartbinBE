import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from './config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';

/**
 * Load Scalar via native ESM import so Nest's CJS build does not
 * `require()` Scalar's ESM-only deps (fails on Node 18).
 * Function() prevents TypeScript from rewriting import() → require().
 */
async function loadScalarApiReference() {
  const scalar = (await new Function(
    'return import("@scalar/nestjs-api-reference")',
  )()) as typeof import('@scalar/nestjs-api-reference');
  return scalar.apiReference;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService<ConfigAttributes>);

  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: '*',
  });
  app.use(
    helmet({
      xPoweredBy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, 'unpkg.com'],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            'cdn.jsdelivr.net',
            'fonts.googleapis.com',
            'unpkg.com',
          ],
          fontSrc: [`'self'`, 'fonts.gstatic.com', 'data:'],
          imgSrc: [`'self'`, 'data:', 'cdn.jsdelivr.net'],
          scriptSrc: [
            `'self'`,
            `https: 'unsafe-inline'`,
            `cdn.jsdelivr.net`,
            `'unsafe-eval'`,
          ],
        },
      },
    }),
  );

  app.use(
    session({
      secret: config.get('SESSION_SECRET') || 'default_session_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1 hour
      },
    }),
  );

  app.enableVersioning();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smartbin backend Documentation')
    .setDescription('')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addSecurityRequirements('access-token')
    .setVersion('1.0')
    .addTag('smartbin')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory, {
    swaggerOptions: {
      docExpansion: 'list',
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  const apiReference = await loadScalarApiReference();
  app.use(
    '/documentation',
    apiReference({
      content: documentFactory(),
      tagsSorter: 'alpha',
      theme: 'deepSpace',
      title: 'Smartbin API Reference',
      setPageTitle: (input) => `Smartbin API Reference - ${input.title}`,
    }),
  );

  const port = config.get('port', { infer: true });

  app.set('trust proxy');

  await app.listen(port);
}
bootstrap();
