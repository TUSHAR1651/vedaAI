import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { redisKeys } from '../constants';

/**
 * Thin convenience layer over the raw Redis client for the two things the spec
 * calls out: generation status/progress tracking and optional prompt caching.
 */
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  get client(): Redis {
    return this.redis;
  }

  async setStatus(assignmentId: string, status: string): Promise<void> {
    // 1 hour TTL — status is a cache of the source-of-truth Mongo doc.
    await this.redis.set(redisKeys.status(assignmentId), status, 'EX', 3600);
  }

  async getStatus(assignmentId: string): Promise<string | null> {
    return this.redis.get(redisKeys.status(assignmentId));
  }

  async setProgress(
    assignmentId: string,
    payload: { stage: string; label: string; progress: number },
  ): Promise<void> {
    await this.redis.set(redisKeys.progress(assignmentId), JSON.stringify(payload), 'EX', 3600);
  }

  async getProgress(assignmentId: string): Promise<unknown | null> {
    const raw = await this.redis.get(redisKeys.progress(assignmentId));
    return raw ? JSON.parse(raw) : null;
  }

  // ---- Optional prompt caching ----------------------------------------

  async getCachedCompletion(hash: string): Promise<string | null> {
    return this.redis.get(redisKeys.promptCache(hash));
  }

  async cacheCompletion(hash: string, value: string, ttlSeconds = 86400): Promise<void> {
    try {
      await this.redis.set(redisKeys.promptCache(hash), value, 'EX', ttlSeconds);
    } catch (e) {
      this.logger.warn(`Failed to cache completion: ${(e as Error).message}`);
    }
  }
}
