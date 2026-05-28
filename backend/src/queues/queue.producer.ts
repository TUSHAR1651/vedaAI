import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { GENERATION_JOBS, PDF_JOBS, QUEUES } from '../common/constants';
import { ExportPdfJob, GenerateFullPaperJob, RegenerateSectionJob } from './job-data';

/**
 * Thin producer facade. Controllers/services enqueue work through here instead
 * of touching Queue instances directly — keeps job names and payload shapes
 * in one place.
 */
@Injectable()
export class QueueProducer {
  private readonly logger = new Logger(QueueProducer.name);

  constructor(
    @InjectQueue(QUEUES.QUESTION_GENERATION) private readonly generationQueue: Queue,
    @InjectQueue(QUEUES.PDF_GENERATION) private readonly pdfQueue: Queue,
  ) {}

  async enqueueFullPaper(data: GenerateFullPaperJob) {
    const job = await this.generationQueue.add(GENERATION_JOBS.FULL_PAPER, data);
    this.logger.log(`Enqueued full-paper generation job ${job.id} for ${data.assignmentId}`);
    return job.id;
  }

  async enqueueSectionRegen(data: RegenerateSectionJob) {
    const job = await this.generationQueue.add(GENERATION_JOBS.SINGLE_SECTION, data);
    this.logger.log(
      `Enqueued section-regen job ${job.id} for paper ${data.paperId} section ${data.sectionIndex}`,
    );
    return job.id;
  }

  async enqueuePdfExport(data: ExportPdfJob) {
    const job = await this.pdfQueue.add(PDF_JOBS.EXPORT_PAPER, data);
    this.logger.log(`Enqueued PDF export job ${job.id} for paper ${data.paperId}`);
    return job.id;
  }
}
