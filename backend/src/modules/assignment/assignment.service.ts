import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assignment, AssignmentDocument } from './entities/assignment.entity';
import { GeneratedPaper, GeneratedPaperDocument } from './entities/generated-paper.entity';
import { QueueProducer } from '../../queues/queue.producer';
import { RedisService } from '../../common/redis/redis.service';
import { GENERATION_STATUS } from '../../common/constants';
import { CreateAssignmentInput, computeTotals } from '../../schemas/create-assignment.schema';

/**
 * Application service for assignments. Persists the teacher's request, then
 * hands generation off to the queue — the HTTP request returns immediately
 * while the worker does the heavy async AI work (no synchronous AI calls).
 */
@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(GeneratedPaper.name) private readonly paperModel: Model<GeneratedPaperDocument>,
    private readonly queue: QueueProducer,
    private readonly redis: RedisService,
  ) {}

  async create(input: CreateAssignmentInput) {
    const { totalQuestions, totalMarks } = computeTotals(input.questionSpec);
    const assignment = await this.assignmentModel.create({
      ...input,
      dueDate: new Date(input.dueDate),
      totalQuestions,
      totalMarks,
      status: GENERATION_STATUS.PENDING,
    });

    await this.redis.setStatus(assignment._id.toString(), GENERATION_STATUS.PENDING);
    await this.queue.enqueueFullPaper({ assignmentId: assignment._id.toString() });

    this.logger.log(`Created assignment ${assignment._id} and queued generation`);
    return assignment.toJSON();
  }

  async list() {
    return this.assignmentModel.find().sort({ createdAt: -1 }).limit(50).lean();
  }

  async findOne(id: string) {
    const assignment = await this.assignmentModel.findById(this.oid(id)).lean();
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    return assignment;
  }

  /** Combined status view: Mongo doc status + live Redis progress. */
  async getStatus(id: string) {
    const assignment = await this.findOne(id);
    const [progress, redisStatus] = await Promise.all([
      this.redis.getProgress(id),
      this.redis.getStatus(id),
    ]);
    return {
      assignmentId: id,
      status: assignment.status,
      redisStatus,
      progress,
      errorMessage: assignment.errorMessage ?? null,
    };
  }

  async getPaper(assignmentId: string) {
    const paper = await this.paperModel.findOne({ assignmentId: this.oid(assignmentId) }).lean();
    if (!paper) {
      throw new NotFoundException(`No generated paper for assignment ${assignmentId} yet`);
    }
    return paper;
  }

  async getPaperById(paperId: string) {
    const paper = await this.paperModel.findById(this.oid(paperId)).lean();
    if (!paper) throw new NotFoundException(`Paper ${paperId} not found`);
    return paper;
  }

  /** Re-queue a full regeneration for an existing assignment. */
  async regeneratePaper(id: string) {
    const assignment = await this.assignmentModel.findById(this.oid(id));
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);

    assignment.status = GENERATION_STATUS.PENDING;
    assignment.errorMessage = null;
    await assignment.save();
    await this.redis.setStatus(id, GENERATION_STATUS.PENDING);

    const jobId = await this.queue.enqueueFullPaper({ assignmentId: id });
    return { assignmentId: id, jobId, status: GENERATION_STATUS.PENDING };
  }

  /** Re-queue regeneration of a single section by index. */
  async regenerateSection(assignmentId: string, sectionIndex: number) {
    const paper = await this.paperModel.findOne({ assignmentId: this.oid(assignmentId) });
    if (!paper) throw new NotFoundException(`No generated paper for assignment ${assignmentId}`);
    if (sectionIndex < 0 || sectionIndex >= paper.sections.length) {
      throw new NotFoundException(`Section index ${sectionIndex} out of range`);
    }

    const jobId = await this.queue.enqueueSectionRegen({
      assignmentId,
      paperId: paper._id.toString(),
      sectionIndex,
    });
    return { assignmentId, paperId: paper._id.toString(), sectionIndex, jobId };
  }

  /** Delete an assignment and its generated paper (card menu → Delete). */
  async remove(id: string) {
    const assignment = await this.assignmentModel.findByIdAndDelete(this.oid(id));
    if (!assignment) throw new NotFoundException(`Assignment ${id} not found`);
    await this.paperModel.deleteOne({ assignmentId: assignment._id });
    await this.redis.client.del(`assignment:${id}:status`, `assignment:${id}:progress`);
    this.logger.log(`Deleted assignment ${id} and its paper`);
    return { deleted: true, id };
  }

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid id: ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
