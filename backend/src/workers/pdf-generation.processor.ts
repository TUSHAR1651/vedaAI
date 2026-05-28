import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../common/constants';
import { PdfService } from '../modules/pdf/pdf.service';
import { ExportPdfJob } from '../queues/job-data';

/**
 * BullMQ worker for the `pdf-generation` queue. Renders the paper to a PDF with
 * @react-pdf/renderer, stores it and broadcasts the download URL. Inherits the
 * attempts:3 + exponential backoff retry policy from the queue defaults.
 */
@Processor(QUEUES.PDF_GENERATION, { concurrency: 2 })
export class PdfGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfGenerationProcessor.name);

  constructor(private readonly pdf: PdfService) {
    super();
  }

  async process(job: Job<ExportPdfJob>): Promise<{ url: string; fileName: string }> {
    this.logger.log(`Rendering PDF for paper ${job.data.paperId} (attempt ${job.attemptsMade + 1})`);
    try {
      return await this.pdf.generate(job.data.assignmentId, job.data.paperId);
    } catch (err) {
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 >= attempts) {
        this.pdf.notifyFailure(
          job.data.assignmentId,
          job.data.paperId,
          (err as Error).message || 'PDF generation failed',
        );
      }
      throw err;
    }
  }
}
