import { Env } from './env.validation';

/**
 * Typed, namespaced configuration object derived from validated env vars.
 * Consumed across the app via `ConfigService.get('<namespace>')`.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  mongoUri: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    tls?: Record<string, unknown>;
  };
  ai: {
    provider: 'openai' | 'gemini' | 'mock';
    openaiApiKey: string;
    openaiModel: string;
    geminiApiKey: string;
    geminiModel: string;
    maxValidationRetries: number;
  };
  storage: {
    dir: string;
    publicBaseUrl: string;
  };
}

/**
 * If REDIS_URL is set (Railway, Heroku-style providers), parse it into the
 * discrete fields used by ioredis + BullMQ. `rediss://` triggers TLS.
 */
function redisFromUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: decodeURIComponent(u.username) || undefined,
    password: decodeURIComponent(u.password) || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
  };
}

/** ConfigModule `load` factory. Receives the already-validated process.env. */
export const configuration = (): AppConfig => {
  const env = process.env as unknown as Env;
  const redisUrl = env.REDIS_URL ? redisFromUrl(env.REDIS_URL) : null;
  return {
    nodeEnv: env.NODE_ENV,
    port: Number(env.PORT),
    corsOrigins: String(env.CORS_ORIGIN)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    // Either MONGO_URI or MONGO_URL — env validation already guarantees one is set.
    mongoUri: (env.MONGO_URI || env.MONGO_URL) as string,
    redis: {
      host: redisUrl?.host ?? env.REDIS_HOST,
      port: redisUrl?.port ?? Number(env.REDIS_PORT),
      password: redisUrl?.password ?? (env.REDIS_PASSWORD || undefined),
      username: redisUrl?.username,
      tls: redisUrl?.tls,
    },
    ai: {
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      openaiModel: env.OPENAI_MODEL,
      geminiApiKey: env.GEMINI_API_KEY,
      geminiModel: env.GEMINI_MODEL,
      maxValidationRetries: Number(env.AI_MAX_VALIDATION_RETRIES),
    },
    storage: {
      dir: env.STORAGE_DIR,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
  };
};
