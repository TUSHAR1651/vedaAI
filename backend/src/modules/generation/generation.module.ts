import { Module } from '@nestjs/common';
import { AssignmentMongooseModule } from '../assignment/assignment.mongoose';
import { WebsocketModule } from '../../websocket/websocket.module';
import { AiService } from './ai/ai.service';
import { GenerationService } from './generation.service';
import { QuestionGenerationProcessor } from '../../workers/question-generation.processor';

/**
 * Owns the AI integration, the generation orchestration service and the
 * `question-generation` BullMQ worker. QueueModule and RedisModule are global,
 * so only the data models + websocket need importing here.
 */
@Module({
  imports: [AssignmentMongooseModule, WebsocketModule],
  providers: [AiService, GenerationService, QuestionGenerationProcessor],
  exports: [AiService, GenerationService],
})
export class GenerationModule {}
