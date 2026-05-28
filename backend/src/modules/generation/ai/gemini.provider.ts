import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, CompletionRequest } from './ai-provider.interface';

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger('GeminiProvider');
  private readonly client: GoogleGenerativeAI;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {
    if (!apiKey) {
      throw new Error('AI_PROVIDER=gemini but GEMINI_API_KEY is empty');
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async complete(req: CompletionRequest): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: req.system,
      generationConfig: {
        temperature: 0.7,
        // Gemini honours an explicit JSON mime type.
        responseMimeType: req.jsonMode === false ? 'text/plain' : 'application/json',
      },
    });

    const result = await model.generateContent(req.user);
    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned an empty completion');
    }
    return text;
  }
}
