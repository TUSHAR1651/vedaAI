import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './queues/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { GenerationModule } from './modules/generation/generation.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    // Global, validated configuration (fails fast on bad env).
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Explicit so it works regardless of where the process is launched from.
      envFilePath: ['.env'],
      validate: validateEnv,
      load: [configuration],
    }),
    // MongoDB persistence.
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get('mongoUri') }),
    }),
    // Infrastructure (global): Redis client + BullMQ queues.
    RedisModule,
    QueueModule,
    // Real-time + feature modules.
    WebsocketModule,
    GenerationModule,
    PdfModule,
    AssignmentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
