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

/** ConfigModule `load` factory. Receives the already-validated process.env. */
export const configuration = (): AppConfig => {
  const env = process.env as unknown as Env;
  return {
    nodeEnv: env.NODE_ENV,
    port: Number(env.PORT),
    corsOrigins: String(env.CORS_ORIGIN)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    mongoUri: env.MONGO_URI,
    redis: {
      host: env.REDIS_HOST,
      port: Number(env.REDIS_PORT),
      password: env.REDIS_PASSWORD || undefined,
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
