import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GENERATION_JOBS, QUEUES } from '../common/constants';
import { GenerationService } from '../modules/generation/generation.service';
import { GenerateFullPaperJob, RegenerateSectionJob } from '../queues/job-data';

/**
 * BullMQ worker for the `question-generation` queue. Runs in-process so it
 * shares DI (models, AI service, websocket) with the API. Handles two job
 * types: a full paper and a single-section regen.
 *
 * On error it lets the exception propagate so BullMQ applies the configured
 * retry policy (attempts: 3, exponential backoff). It only flips the assignment
 * to `failed` + emits `generation_failed` on the *final* attempt, so transient
 * errors recover silently.
 */
@Processor(QUEUES.QUESTION_GENERATION, { concurrency: 3 })
export class QuestionGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(QuestionGenerationProcessor.name);

  constructor(private readonly generation: GenerationService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing ${job.name} (job ${job.id}, attempt ${job.attemptsMade + 1})`);
    try {
      switch (job.name) {
        case GENERATION_JOBS.FULL_PAPER: {
          const data = job.data as GenerateFullPaperJob;
          await this.generation.runGeneration(data.assignmentId);
          break;
        }
        case GENERATION_JOBS.SINGLE_SECTION: {
          const data = job.data as RegenerateSectionJob;
          await this.generation.runSectionRegen(data.assignmentId, data.paperId, data.sectionIndex);
          break;
        }
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (err) {
      const attempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;
      this.logger.warn(
        `Job ${job.id} failed (attempt ${job.attemptsMade + 1}/${attempts}): ${(err as Error).message}`,
      );
      if (isFinalAttempt) {
        await this.generation.markFailed((job.data as { assignmentId: string }).assignmentId, err);
      }
      throw err; // hand control back to BullMQ for retry / final fail
    }
  }
}
