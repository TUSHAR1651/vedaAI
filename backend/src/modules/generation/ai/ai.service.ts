import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AiProvider, CompletionRequest } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { MockProvider } from './mock.provider';
import { RedisService } from '../../../common/redis/redis.service';
import {
  GeneratedPaperContract,
  GeneratedSection,
  QuestionType,
  validatePaper,
  validateSection,
} from '../../../schemas/assessment.schema';
import {
  PromptInput,
  SYSTEM_PROMPT,
  buildSectionPrompt,
  buildUserPrompt,
} from '../../../prompts/assessment.prompt';

type ProgressFn = (info: { attempt: number }) => Promise<void> | void;

/**
 * Wraps the configured AI provider with the production concerns the spec asks
 * for: structured-output validation, automatic retry on validation failure,
 * and optional prompt caching. The provider only ever returns raw text; this
 * service is the boundary that turns it into trusted, validated data.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider: AiProvider;
  private readonly maxValidationRetries: number;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const ai = this.config.get('ai');
    this.maxValidationRetries = ai.maxValidationRetries;
    this.provider = this.createProvider(ai);
    this.logger.log(`AI provider initialised: ${this.provider.name}`);
  }

  private createProvider(ai: any): AiProvider {
    switch (ai.provider) {
      case 'openai':
        return new OpenAiProvider(ai.openaiApiKey, ai.openaiModel);
      case 'gemini':
        return new GeminiProvider(ai.geminiApiKey, ai.geminiModel);
      case 'mock':
      default:
        return new MockProvider();
    }
  }

  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Generate a full, validated paper. Retries the *entire* AI call when the
   * model returns JSON that fails the Zod contract — the spec's
   * "if validation fails: retry AI generation" requirement.
   */
  async generatePaper(input: PromptInput, onAttempt?: ProgressFn): Promise<GeneratedPaperContract> {
    const system = SYSTEM_PROMPT;
    const user = buildUserPrompt(input);
    const cacheKey = this.hash(system + user);

    const errors: string[][] = [];
    for (let attempt = 0; attempt <= this.maxValidationRetries; attempt++) {
      await onAttempt?.({ attempt });

      const raw = await this.completeWithCache(system, user, cacheKey, attempt, { input });
      const result = validatePaper(raw);

      if (result.success && result.data) {
        return result.data;
      }

      errors.push(result.errors ?? ['unknown validation error']);
      this.logger.warn(
        `Paper validation failed (attempt ${attempt + 1}/${this.maxValidationRetries + 1}): ${result.errors?.join('; ')}`,
      );
      // Bust the cache for the next attempt so we actually re-call the model.
      await this.redis.cacheCompletion(cacheKey, '', 1).catch(() => undefined);
    }

    throw new ValidationFailedError(
      'AI output failed schema validation after all retries',
      errors.flat(),
    );
  }

  /** Generate a single validated section (used by "regenerate section"). */
  async generateSection(
    input: PromptInput,
    section: { title: string; type: QuestionType; count: number; marks: number },
  ): Promise<GeneratedSection> {
    const { system, user } = buildSectionPrompt(input, section);
    const errors: string[][] = [];

    for (let attempt = 0; attempt <= this.maxValidationRetries; attempt++) {
      const raw = await this.provider.complete({
        system,
        user,
        jsonMode: true,
        meta: { input, section },
      });
      const result = validateSection(raw);
      if (result.success) return result.data;
      errors.push(result.errors);
      this.logger.warn(`Section validation failed (attempt ${attempt + 1}): ${result.errors.join('; ')}`);
    }

    throw new ValidationFailedError('Section output failed schema validation', errors.flat());
  }

  private async completeWithCache(
    system: string,
    user: string,
    cacheKey: string,
    attempt: number,
    meta: CompletionRequest['meta'],
  ): Promise<string> {
    // Only the first attempt may serve from cache; retries must hit the model.
    if (attempt === 0) {
      const cached = await this.redis.getCachedCompletion(cacheKey).catch(() => null);
      if (cached) {
        this.logger.debug('Serving completion from prompt cache');
        return cached;
      }
    }

    const raw = await this.provider.complete({ system, user, jsonMode: true, meta });
    await this.redis.cacheCompletion(cacheKey, raw).catch(() => undefined);
    return raw;
  }

  private hash(input: string): string {
    return createHash('sha256').update(`${this.provider.name}:${input}`).digest('hex');
  }
}

/** Raised when the model can't produce schema-valid output within the retry budget. */
export class ValidationFailedError extends Error {
  constructor(
    message: string,
    public readonly issues: string[],
  ) {
    super(message);
    this.name = 'ValidationFailedError';
  }
}
