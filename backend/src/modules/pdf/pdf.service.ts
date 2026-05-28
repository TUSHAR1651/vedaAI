import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  GeneratedPaper,
  GeneratedPaperDocument,
} from '../assignment/entities/generated-paper.entity';
import { QueueProducer } from '../../queues/queue.producer';
import { RealtimeService } from '../../websocket/realtime.service';
import { buildPdf } from './pdf-document';

// pdf-parse's index.js runs a debug block that reads a local test PDF when
// imported directly; importing the lib entrypoint avoids that side effect.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/**
 * Handles both PDF concerns:
 *  - extracting text from an optional uploaded reference (PDF/text) at create
 *    time, so the AI can ground questions in source material; and
 *  - asynchronously rendering the generated paper to a downloadable PDF via a
 *    BullMQ job (NOT browser print).
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly storageDir: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly queue: QueueProducer,
    private readonly realtime: RealtimeService,
    @InjectModel(GeneratedPaper.name) private readonly paperModel: Model<GeneratedPaperDocument>,
  ) {
    const storage = this.config.get('storage');
    this.storageDir = path.resolve(storage.dir);
    this.publicBaseUrl = storage.publicBaseUrl;
  }

  /** Extract plain text from an uploaded reference file. */
  async extractText(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isText =
      file.mimetype.startsWith('text/') || /\.(txt|md)$/i.test(file.originalname);

    let text = '';
    if (isPdf) {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text ?? '';
    } else if (isText) {
      text = file.buffer.toString('utf8');
    } else {
      throw new BadRequestException('Unsupported file type. Upload a PDF or text file.');
    }

    text = text.replace(/\s+\n/g, '\n').trim().slice(0, 50000);
    return { fileName: file.originalname, characters: text.length, text };
  }

  /** Enqueue an async PDF export for an assignment's paper. */
  async requestExport(assignmentId: string) {
    const paper = await this.paperModel.findOne({ assignmentId: this.oid(assignmentId) }).lean();
    if (!paper) throw new NotFoundException(`No generated paper for assignment ${assignmentId}`);

    this.realtime.pdfStarted(assignmentId, paper._id.toString());
    const jobId = await this.queue.enqueuePdfExport({
      assignmentId,
      paperId: paper._id.toString(),
    });
    return { assignmentId, paperId: paper._id.toString(), jobId, status: 'processing' };
  }

  /** Worker entrypoint: render + persist the PDF, then broadcast its URL. */
  async generate(assignmentId: string, paperId: string) {
    const paper = await this.paperModel.findById(this.oid(paperId));
    if (!paper) throw new NotFoundException(`Paper ${paperId} not found`);

    const buffer = await buildPdf({
      schoolName: paper.schoolName,
      title: paper.title,
      subject: paper.subject,
      className: paper.className,
      timeAllowedMinutes: paper.timeAllowedMinutes,
      totalMarks: paper.totalMarks,
      sections: paper.sections.map((s) => ({
        title: s.title,
        instruction: s.instruction,
        questions: s.questions.map((q) => ({
          question: q.question,
          marks: q.marks,
          type: q.type,
          options: q.options,
          answer: q.answer,
        })),
      })),
    });

    await fs.mkdir(this.storageDir, { recursive: true });
    const fileName = `paper-${paperId}-${Date.now()}.pdf`;
    await fs.writeFile(path.join(this.storageDir, fileName), buffer);

    const url = `${this.publicBaseUrl}/api/pdf/file/${fileName}`;
    paper.pdfUrl = url;
    paper.pdfFileName = fileName;
    await paper.save();

    this.realtime.pdfCompleted({ assignmentId, paperId, url, fileName });
    this.logger.log(`Generated PDF ${fileName} (${buffer.length} bytes)`);
    return { url, fileName };
  }

  /** Resolve a stored file for download, guarding against path traversal. */
  resolveFilePath(fileName: string): string {
    const safe = path.basename(fileName);
    return path.join(this.storageDir, safe);
  }

  async fileExists(fileName: string): Promise<boolean> {
    try {
      await fs.access(this.resolveFilePath(fileName));
      return true;
    } catch {
      return false;
    }
  }

  notifyFailure(assignmentId: string, paperId: string, message: string) {
    this.realtime.pdfFailed(assignmentId, paperId, message);
  }

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`Invalid id: ${id}`);
    return new Types.ObjectId(id);
  }
}
