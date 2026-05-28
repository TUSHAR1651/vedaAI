import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { QUESTION_TYPES } from '../../../schemas/assessment.schema';
import { GENERATION_STATUS, GenerationStatus } from '../../../common/constants';

export type AssignmentDocument = HydratedDocument<Assignment>;

/** One requested question-type row: N questions of `type`, `marks` each. */
@Schema({ _id: false })
export class QuestionSpecRow {
  @Prop({ required: true, enum: QUESTION_TYPES })
  type: string;

  @Prop({ required: true, min: 1 })
  count: number;

  @Prop({ required: true, min: 1 })
  marks: number;
}
const QuestionSpecRowSchema = SchemaFactory.createForClass(QuestionSpecRow);

/**
 * `assignments` collection — the teacher's request + lifecycle status.
 * The generated output lives in a separate `generatedPapers` collection.
 */
@Schema({ timestamps: true, collection: 'assignments' })
export class Assignment {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true, trim: true })
  className: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true, min: 1 })
  timeAllowedMinutes: number;

  @Prop({ default: '' })
  instructions: string;

  @Prop({ type: [QuestionSpecRowSchema], default: [] })
  questionSpec: QuestionSpecRow[];

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ default: 0 })
  totalMarks: number;

  /** Extracted text from an optional uploaded reference (PDF / text). */
  @Prop({ default: '' })
  sourceMaterial: string;

  @Prop({
    type: String,
    enum: Object.values(GENERATION_STATUS),
    default: GENERATION_STATUS.PENDING,
    index: true,
  })
  status: GenerationStatus;

  /** Last error surfaced to the client when status === 'failed'. */
  @Prop({ type: String, default: null })
  errorMessage?: string | null;

  /** Number of times generation has been (re)queued for this assignment. */
  @Prop({ default: 0 })
  generationAttempts: number;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
