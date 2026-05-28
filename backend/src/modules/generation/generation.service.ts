import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService, ValidationFailedError } from './ai/ai.service';
import { RealtimeService } from '../../websocket/realtime.service';
import { Assignment, AssignmentDocument } from '../assignment/entities/assignment.entity';
import {
  GeneratedPaper,
  GeneratedPaperDocument,
} from '../assignment/entities/generated-paper.entity';
import { GENERATION_STATUS, PROGRESS_STAGES } from '../../common/constants';
import { PROFILE } from '../../common/profile';
import { PromptInput } from '../../prompts/assessment.prompt';
import { QuestionType, computeTotalMarks } from '../../schemas/assessment.schema';

/**
 * Core generation orchestration, invoked by the BullMQ worker. Owns the
 * pipeline: status transitions, staged progress emission, the AI call (which
 * internally validates + retries), persistence of *structured* output and the
 * final websocket broadcast. Throws on failure so the worker can apply BullMQ's
 * retry policy; `markFailed` is called by the worker only on the final attempt.
 */
@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    private readonly ai: AiService,
    private readonly realtime: RealtimeService,
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(GeneratedPaper.name) private readonly paperModel: Model<GeneratedPaperDocument>,
  ) {}

  private toPromptInput(a: AssignmentDocument): PromptInput {
    return {
      title: a.title,
      subject: a.subject,
      className: a.className,
      timeAllowedMinutes: a.timeAllowedMinutes,
      instructions: a.instructions,
      questionSpec: a.questionSpec.map((r) => ({
        type: r.type as QuestionType,
        count: r.count,
        marks: r.marks,
      })),
      sourceMaterial: a.sourceMaterial,
    };
  }

  /** Full-paper generation. Replaces any existing paper for this assignment. */
  async runGeneration(assignmentId: string): Promise<void> {
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);

    assignment.status = GENERATION_STATUS.PROCESSING;
    assignment.errorMessage = null;
    assignment.generationAttempts += 1;
    await assignment.save();

    await this.realtime.started(assignmentId);
    await this.emit(assignmentId, PROGRESS_STAGES.PARSING);
    await this.emit(assignmentId, PROGRESS_STAGES.GENERATING_SECTIONS);

    const paper = await this.ai.generatePaper(this.toPromptInput(assignment), async () => {
      await this.emit(assignmentId, PROGRESS_STAGES.GENERATING_QUESTIONS);
    });

    await this.emit(assignmentId, PROGRESS_STAGES.VALIDATING);
    await this.emit(assignmentId, PROGRESS_STAGES.FINALIZING);

    // Upsert: a regenerate replaces the previous paper rather than piling up.
    // Header fields are applied server-side (school from the static profile,
    // the rest from the assignment) — not trusted to the model.
    const saved = await this.paperModel.findOneAndUpdate(
      { assignmentId: assignment._id },
      {
        assignmentId: assignment._id,
        schoolName: PROFILE.schoolName,
        title: paper.title || assignment.title,
        subject: assignment.subject,
        className: assignment.className,
        timeAllowedMinutes: assignment.timeAllowedMinutes,
        totalMarks: computeTotalMarks(paper),
        sections: paper.sections,
        pdfUrl: null,
        pdfFileName: null,
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    assignment.status = GENERATION_STATUS.COMPLETED;
    await assignment.save();

    await this.realtime.completed({
      assignmentId,
      paperId: saved._id.toString(),
      paper: saved.toJSON(),
    });
    this.logger.log(`Generation completed for assignment ${assignmentId}`);
  }

  /** Regenerate one section in-place and broadcast the updated paper. */
  async runSectionRegen(assignmentId: string, paperId: string, sectionIndex: number): Promise<void> {
    const [assignment, paper] = await Promise.all([
      this.assignmentModel.findById(assignmentId),
      this.paperModel.findById(paperId),
    ]);
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);
    if (!paper) throw new NotFoundException(`Paper ${paperId} not found`);
    if (sectionIndex < 0 || sectionIndex >= paper.sections.length) {
      throw new NotFoundException(`Section index ${sectionIndex} out of range`);
    }

    // A section regen deliberately does NOT flip the assignment status to
    // "processing": the client keeps the existing paper on screen with a
    // localized overlay and only swaps in the section once it's regenerated.
    const existing = paper.sections[sectionIndex];
    const firstQ = existing.questions[0];
    const section = await this.ai.generateSection(this.toPromptInput(assignment), {
      title: existing.title,
      type: (firstQ?.type as QuestionType) ?? 'short_answer',
      count: existing.questions.length || 4,
      marks: firstQ?.marks || 1,
    });

    paper.sections[sectionIndex] = section as any;
    paper.totalMarks = paper.sections.reduce(
      (sum, s) => sum + s.questions.reduce((qs, q) => qs + q.marks, 0),
      0,
    );
    paper.pdfUrl = null;
    paper.pdfFileName = null;
    paper.markModified('sections');
    await paper.save();

    await this.realtime.completed({
      assignmentId,
      paperId: paper._id.toString(),
      paper: paper.toJSON(),
    });
    this.logger.log(`Regenerated section ${sectionIndex} for paper ${paperId}`);
  }

  /** Called by the worker only when retries are exhausted. */
  async markFailed(assignmentId: string, error: unknown): Promise<void> {
    const message =
      error instanceof ValidationFailedError
        ? error.message
        : (error as Error)?.message || 'Generation failed';
    const errors = error instanceof ValidationFailedError ? error.issues : undefined;

    await this.assignmentModel
      .findByIdAndUpdate(assignmentId, {
        status: GENERATION_STATUS.FAILED,
        errorMessage: message,
      })
      .catch(() => undefined);

    await this.realtime.failed({ assignmentId, message, errors });
    this.logger.error(`Generation failed for ${assignmentId}: ${message}`);
  }

  private emit(assignmentId: string, stage: { stage: string; label: string; progress: number }) {
    return this.realtime.progress({ assignmentId, ...stage });
  }
}
