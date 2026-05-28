import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QUESTION_TYPES } from '../../../schemas/assessment.schema';

export type GeneratedPaperDocument = HydratedDocument<GeneratedPaper>;

/**
 * Persisted, *validated* structured output. These sub-schemas mirror the Zod
 * contract in `schemas/assessment.schema.ts` — Zod guards the boundary, Mongoose
 * guards storage. Nothing untrusted (raw model text) is ever written here.
 */
@Schema({ _id: false })
export class Question {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true, min: 0 })
  marks: number;

  @Prop({ required: true, enum: QUESTION_TYPES })
  type: string;

  @Prop({ type: [String], default: undefined })
  options?: string[];

  // Required for the answer key.
  @Prop({ required: true })
  answer: string;
}
const QuestionSchema = SchemaFactory.createForClass(Question);

@Schema({ _id: false })
export class Section {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  instruction: string;

  @Prop({ type: [QuestionSchema], default: [] })
  questions: Question[];
}
const SectionSchema = SchemaFactory.createForClass(Section);

@Schema({ timestamps: true, collection: 'generatedPapers' })
export class GeneratedPaper {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true, index: true })
  assignmentId: Types.ObjectId;

  // ---- school-branded header (attached server-side) ----
  @Prop({ default: '' })
  schoolName: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  subject: string;

  @Prop({ default: '' })
  className: string;

  @Prop({ default: 0 })
  timeAllowedMinutes: number;

  @Prop({ default: 0 })
  totalMarks: number;

  @Prop({ type: [SectionSchema], default: [] })
  sections: Section[];

  /** Set once an async PDF export job finishes. */
  @Prop({ type: String, default: null })
  pdfUrl?: string | null;

  @Prop({ type: String, default: null })
  pdfFileName?: string | null;

  @Prop({ default: () => new Date() })
  generatedAt: Date;
}

export const GeneratedPaperSchema = SchemaFactory.createForClass(GeneratedPaper);
