import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES, DEFAULT_JOB_OPTS } from '../common/constants';
import { QueueProducer } from './queue.producer';

/**
 * Central BullMQ wiring. The Redis connection and the spec-mandated retry
 * policy (attempts: 3 + exponential backoff) are configured once here and
 * inherited by both queues. Marked @Global so producers can be injected
 * anywhere without re-importing.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.get('redis');
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            username: redis.username,
            password: redis.password,
            tls: redis.tls,
          },
          defaultJobOptions: DEFAULT_JOB_OPTS,
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.QUESTION_GENERATION },
      { name: QUEUES.PDF_GENERATION },
    ),
  ],
  providers: [QueueProducer],
  exports: [BullModule, QueueProducer],
})
export class QueueModule {}
