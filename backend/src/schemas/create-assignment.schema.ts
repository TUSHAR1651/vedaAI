import { z } from 'zod';
import { QUESTION_TYPES } from './assessment.schema';

/**
 * Validation contract for the teacher's "create assignment" request.
 *
 * The wizard models each question type as its own row with a count and
 * marks-per-question; totals are derived. Enforces the spec's rules: no empty
 * values, no invalid marks, no negative/zero counts.
 */
export const questionSpecRowSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  count: z
    .number({ invalid_type_error: 'Number of questions must be a number' })
    .int('Whole numbers only')
    .min(1, 'At least 1 question')
    .max(100, 'Maximum 100 questions'),
  marks: z
    .number({ invalid_type_error: 'Marks must be a number' })
    .int('Whole numbers only')
    .min(1, 'Marks must be greater than 0')
    .max(100, 'Marks per question seems too high'),
});
export type QuestionSpecRow = z.infer<typeof questionSpecRowSchema>;

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  subject: z.string().trim().min(1, 'Subject is required'),
  className: z.string().trim().min(1, 'Class is required'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Due date must be a valid date'),
  timeAllowedMinutes: z
    .number({ invalid_type_error: 'Time allowed must be a number' })
    .int('Whole minutes only')
    .min(1, 'Time allowed must be greater than 0')
    .max(600, 'That seems too long'),
  instructions: z.string().trim().max(4000).optional().default(''),

  /** One row per chosen question type — at least one required. */
  questionSpec: z
    .array(questionSpecRowSchema)
    .min(1, 'Add at least one question type')
    .refine(
      (rows) => new Set(rows.map((r) => r.type)).size === rows.length,
      'Each question type can only be added once',
    ),

  /** Extracted text from an optional uploaded reference (PDF / text). */
  sourceMaterial: z.string().trim().max(50000).optional().default(''),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/** Derived totals used across persistence + display. */
export function computeTotals(rows: QuestionSpecRow[]) {
  const totalQuestions = rows.reduce((s, r) => s + r.count, 0);
  const totalMarks = rows.reduce((s, r) => s + r.count * r.marks, 0);
  return { totalQuestions, totalMarks };
}
