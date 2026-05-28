import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RedisService } from '../common/redis/redis.service';
import {
  GenerationCompletedPayload,
  GenerationFailedPayload,
  PdfCompletedPayload,
  ProgressPayload,
  WS_EVENTS,
} from './ws-events';
import { GENERATION_STATUS } from '../common/constants';

/**
 * The single funnel through which workers report progress. Every call does two
 * things atomically from the caller's perspective:
 *   1. mirror the latest status/progress into Redis (durable, pollable)
 *   2. push the event to all sockets in the assignment room (real-time)
 *
 * This is why a late-joining client (refresh mid-generation) can still recover
 * state by reading Redis, and live clients get instant updates.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly gateway: EventsGateway,
    private readonly redis: RedisService,
  ) {}

  async started(assignmentId: string): Promise<void> {
    await this.redis.setStatus(assignmentId, GENERATION_STATUS.PROCESSING);
    this.gateway.emitToAssignment(assignmentId, WS_EVENTS.GENERATION_STARTED, {
      assignmentId,
      status: GENERATION_STATUS.PROCESSING,
    });
  }

  async progress(payload: ProgressPayload): Promise<void> {
    await this.redis.setProgress(payload.assignmentId, {
      stage: payload.stage,
      label: payload.label,
      progress: payload.progress,
    });
    this.gateway.emitToAssignment(payload.assignmentId, WS_EVENTS.GENERATION_PROGRESS, payload);
  }

  async completed(payload: GenerationCompletedPayload): Promise<void> {
    await this.redis.setStatus(payload.assignmentId, GENERATION_STATUS.COMPLETED);
    await this.redis.setProgress(payload.assignmentId, {
      stage: 'done',
      label: 'Completed',
      progress: 100,
    });
    this.gateway.emitToAssignment(payload.assignmentId, WS_EVENTS.GENERATION_COMPLETED, payload);
  }

  async failed(payload: GenerationFailedPayload): Promise<void> {
    await this.redis.setStatus(payload.assignmentId, GENERATION_STATUS.FAILED);
    this.gateway.emitToAssignment(payload.assignmentId, WS_EVENTS.GENERATION_FAILED, payload);
  }

  // ---- PDF lifecycle ---------------------------------------------------

  pdfStarted(assignmentId: string, paperId: string): void {
    this.gateway.emitToAssignment(assignmentId, WS_EVENTS.PDF_STARTED, { assignmentId, paperId });
  }

  pdfCompleted(payload: PdfCompletedPayload): void {
    this.gateway.emitToAssignment(payload.assignmentId, WS_EVENTS.PDF_COMPLETED, payload);
  }

  pdfFailed(assignmentId: string, paperId: string, message: string): void {
    this.gateway.emitToAssignment(assignmentId, WS_EVENTS.PDF_FAILED, {
      assignmentId,
      paperId,
      message,
    });
  }
}
