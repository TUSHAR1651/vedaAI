import { z } from 'zod';

/**
 * ============================================================
 *  AI OUTPUT CONTRACT
 * ------------------------------------------------------------
 *  Single source of truth for the *shape* of every paper the AI
 *  produces. The worker validates raw model output against these
 *  schemas before anything is persisted or sent to the client.
 *
 *  The header fields (school, subject, class, time, total marks)
 *  are attached server-side from the assignment + static profile —
 *  the model is only responsible for the title + the sections of
 *  questions (with answers, for the answer key).
 * ============================================================
 */

/** Question types selectable in the create wizard (one row per type). */
export const QUESTION_TYPES = [
  'multiple_choice',
  'short_answer',
  'long_answer',
  'diagram',
  'numerical',
  'true_false',
  'fill_in_the_blank',
] as const;
export const questionTypeEnum = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeEnum>;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice Questions',
  short_answer: 'Short Questions',
  long_answer: 'Long Answer Questions',
  diagram: 'Diagram / Graph Based Questions',
  numerical: 'Numerical Problems',
  true_false: 'True / False',
  fill_in_the_blank: 'Fill in the Blanks',
};

/** A single question. `options` is only meaningful for MCQ/true-false. */
export const questionSchema = z.object({
  question: z.string().trim().min(1, 'question text must not be empty'),
  marks: z.number().positive('marks must be a positive number'),
  type: questionTypeEnum,
  options: z.array(z.string().min(1)).optional(),
  // Required so the Answer Key can always be rendered.
  answer: z.string().trim().min(1, 'answer must not be empty'),
});
export type GeneratedQuestion = z.infer<typeof questionSchema>;

export const sectionSchema = z.object({
  title: z.string().trim().min(1, 'section title must not be empty'),
  instruction: z.string().trim().default(''),
  questions: z.array(questionSchema).min(1, 'each section needs at least one question'),
});
export type GeneratedSection = z.infer<typeof sectionSchema>;

/** Top-level contract the model MUST satisfy (title + sections only). */
export const generatedPaperSchema = z.object({
  title: z.string().trim().min(1, 'paper title must not be empty'),
  sections: z.array(sectionSchema).min(1, 'paper must contain at least one section'),
});
export type GeneratedPaperContract = z.infer<typeof generatedPaperSchema>;

/** A single section produced by a "regenerate section" request. */
export const singleSectionSchema = sectionSchema;

/**
 * Defensive parse helper: strip ```json fences and isolate the outermost JSON
 * object so a cosmetic formatting slip doesn't burn a retry attempt.
 */
export function extractJson(raw: string): unknown {
  let text = raw.trim();

  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

export interface PaperValidationResult {
  success: boolean;
  data?: GeneratedPaperContract;
  errors?: string[];
}

/** Parse raw model text → validated paper. Never throws. */
export function validatePaper(raw: string): PaperValidationResult {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (e) {
    return { success: false, errors: [`Response was not valid JSON: ${(e as Error).message}`] };
  }

  const parsed = generatedPaperSchema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`),
    };
  }
  return { success: true, data: parsed.data };
}

/** Parse raw model text → validated single section. Never throws. */
export function validateSection(
  raw: string,
): { success: true; data: GeneratedSection } | { success: false; errors: string[] } {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (e) {
    return { success: false, errors: [`Response was not valid JSON: ${(e as Error).message}`] };
  }
  const parsed = singleSectionSchema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`),
    };
  }
  return { success: true, data: parsed.data };
}

/** Recompute total marks from sections (don't trust the model's arithmetic). */
export function computeTotalMarks(paper: GeneratedPaperContract): number {
  return paper.sections.reduce(
    (sum, s) => sum + s.questions.reduce((qs, q) => qs + q.marks, 0),
    0,
  );
}
