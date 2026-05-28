import { z } from 'zod';

/**
 * Strict environment validation. The app refuses to boot with a misconfigured
 * environment — failing fast is preferable to surfacing cryptic runtime errors
 * deep inside a worker.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // Mongo: accept either MONGO_URI (canonical) or MONGO_URL (the var name
    // exposed by Railway's MongoDB plugin). At least one is required.
    MONGO_URI: z.string().optional(),
    MONGO_URL: z.string().optional(),

    // Redis: full URL takes precedence; the discrete host/port/password trio is
    // kept as a fallback for setups that don't have a single URL.
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),

  AI_PROVIDER: z.enum(['openai', 'gemini', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_MAX_VALIDATION_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

    STORAGE_DIR: z.string().default('./storage'),
    PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  })
  .refine((env) => Boolean(env.MONGO_URI || env.MONGO_URL), {
    message: 'Either MONGO_URI or MONGO_URL is required',
    path: ['MONGO_URI'],
  });

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.forRoot({ validate }). */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
