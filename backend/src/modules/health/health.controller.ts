import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../generation/ai/ai.service';

@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly ai: AiService,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'vedaai-backend',
      aiProvider: this.ai.providerName,
      env: this.config.get('nodeEnv'),
      timestamp: new Date().toISOString(),
    };
  }
}
