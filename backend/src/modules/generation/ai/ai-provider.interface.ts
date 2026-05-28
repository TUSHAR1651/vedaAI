import { PromptInput } from '../../../prompts/assessment.prompt';

/** A provider returns raw text; structured validation happens upstream. */
export interface CompletionRequest {
  system: string;
  user: string;
  /** Hint the provider to emit a JSON object when supported. */
  jsonMode?: boolean;
  /**
   * Structured request payload. Real providers ignore this (they read the
   * prompt strings); the deterministic mock uses it to build schema-valid
   * output without fragile prompt-string parsing.
   */
  meta?: {
    input: PromptInput;
    /** Present for single-section regeneration. */
    section?: { title: string; type: string; count: number; marks: number };
  };
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<string>;
}

export const AI_PROVIDER = 'AI_PROVIDER_TOKEN';
