import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  app.enableCors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true });

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalFilters(new AllExceptionsFilter());
  // Body validation uses per-route Zod pipes (see ZodValidationPipe); numeric
  // route params use the built-in ParseIntPipe. We intentionally avoid the
  // class-validator-based global ValidationPipe to keep a single Zod story.
  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 VedaAI backend running on http://localhost:${port}`);
  logger.log(`   API prefix: /api  •  AI provider: ${config.get('ai').provider}`);
  logger.log(`   CORS origins: ${corsOrigins.join(', ') || '*'}`);
}

bootstrap();
