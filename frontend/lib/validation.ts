import { z } from 'zod';
import { QUESTION_TYPES } from '@/types';

/**
 * Client-side validation contract. Intentionally identical in spirit to the
 * backend's `create-assignment.schema.ts` so the UI catches bad input before
 * it ever hits the network (no empty values, no invalid marks, no negatives).
 */
export const questionSpecRowSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  count: z.coerce
    .number({ invalid_type_error: 'Number required' })
    .int('Whole numbers only')
    .min(1, 'At least 1')
    .max(100, 'Max 100'),
  marks: z.coerce
    .number({ invalid_type_error: 'Number required' })
    .int('Whole numbers only')
    .min(1, 'Must be > 0')
    .max(100, 'Too high'),
});
export type QuestionSpecRowInput = z.infer<typeof questionSpecRowSchema>;

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  subject: z.string().trim().min(1, 'Subject is required'),
  className: z.string().trim().min(1, 'Class is required'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date'),
  timeAllowedMinutes: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole minutes only')
    .min(1, 'Must be greater than 0')
    .max(600, 'Too long'),
  instructions: z.string().trim().max(4000).optional().default(''),
  questionSpec: z
    .array(questionSpecRowSchema)
    .min(1, 'Add at least one question type')
    .refine(
      (rows) => new Set(rows.map((r) => r.type)).size === rows.length,
      'Each question type can only be added once',
    ),
  sourceMaterial: z.string().trim().max(50000).optional().default(''),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/** Local default for the wizard. Sensible starter rows the teacher can edit. */
export const DEFAULT_FORM_VALUES: CreateAssignmentInput = {
  title: '',
  subject: '',
  className: '',
  dueDate: '',
  timeAllowedMinutes: 45,
  instructions: '',
  questionSpec: [
    { type: 'multiple_choice', count: 5, marks: 1 },
    { type: 'short_answer', count: 5, marks: 2 },
  ],
  sourceMaterial: '',
};

export function computeTotals(rows: QuestionSpecRowInput[]) {
  const totalQuestions = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
  const totalMarks = rows.reduce(
    (s, r) => s + (Number(r.count) || 0) * (Number(r.marks) || 0),
    0,
  );
  return { totalQuestions, totalMarks };
}
