import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AiProvider, CompletionRequest } from './ai-provider.interface';

export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly logger = new Logger('OpenAiProvider');
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    if (!apiKey) {
      throw new Error('AI_PROVIDER=openai but OPENAI_API_KEY is empty');
    }
    this.client = new OpenAI({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      // Forces a JSON object response — the first line of defense for
      // structured output (Zod validation is the second).
      response_format: req.jsonMode === false ? undefined : { type: 'json_object' },
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? '';
    if (!text) {
      throw new Error('OpenAI returned an empty completion');
    }
    return text;
  }
}
