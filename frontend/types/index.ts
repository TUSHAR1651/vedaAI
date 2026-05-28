/**
 * Shared types — kept in lockstep with `backend/src/schemas/assessment.schema.ts`
 * and `backend/src/schemas/create-assignment.schema.ts`. The UI renders strictly
 * from these structured types; raw model output is never displayed.
 */

export const QUESTION_TYPES = [
  'multiple_choice',
  'short_answer',
  'long_answer',
  'diagram',
  'numerical',
  'true_false',
  'fill_in_the_blank',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice Questions',
  short_answer: 'Short Questions',
  long_answer: 'Long Answer Questions',
  diagram: 'Diagram / Graph Based Questions',
  numerical: 'Numerical Problems',
  true_false: 'True / False',
  fill_in_the_blank: 'Fill in the Blanks',
};

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QuestionSpecRow {
  type: QuestionType;
  count: number;
  marks: number;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  timeAllowedMinutes: number;
  instructions: string;
  questionSpec: QuestionSpecRow[];
  totalQuestions: number;
  totalMarks: number;
  sourceMaterial?: string;
  status: GenerationStatus;
  errorMessage?: string | null;
  generationAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  question: string;
  marks: number;
  type: QuestionType;
  options?: string[];
  answer: string;
}

export interface PaperSection {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface GeneratedPaper {
  _id: string;
  assignmentId: string;
  schoolName: string;
  title: string;
  subject: string;
  className: string;
  timeAllowedMinutes: number;
  totalMarks: number;
  sections: PaperSection[];
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  generatedAt: string;
}

// ---- websocket payloads ----
// Matches `backend/src/websocket/ws-events.ts` exactly.
export interface ProgressEvent {
  assignmentId: string;
  stage: string;
  label: string;
  progress: number; // 0..100
}
export interface StartedEvent {
  assignmentId: string;
  at: string;
}
export interface CompletedEvent {
  assignmentId: string;
  paperId: string;
  paper: GeneratedPaper;
}
export interface FailedEvent {
  assignmentId: string;
  message: string;
  errors?: string[];
}
export interface PdfReadyEvent {
  assignmentId: string;
  paperId: string;
  url: string;
  fileName: string;
}
export interface PdfFailedEvent {
  assignmentId: string;
  paperId: string;
  message: string;
}

// Legacy aliases (kept so we don't have to thread the rename through every
// caller in the same pass).
export type ProgressPayload = ProgressEvent;
export type GenerationCompletedPayload = CompletedEvent;
export type GenerationFailedPayload = FailedEvent;
export type PdfCompletedPayload = PdfReadyEvent;

// ---- status snapshot returned by GET /assignments/:id/status ----
export interface StatusResponse {
  assignmentId: string;
  status: GenerationStatus;
  /**
   * Latest snapshot of the in-flight progress. Same shape as the websocket
   * ProgressEvent (minus the assignmentId, which is implicit).
   */
  progress: Pick<ProgressEvent, 'stage' | 'label' | 'progress'> | null;
  errorMessage?: string | null;
}

// ---- create-assignment DTO (client -> server) ----
export interface CreateAssignmentDto {
  title: string;
  subject: string;
  className: string;
  dueDate: string;
  timeAllowedMinutes: number;
  instructions?: string;
  questionSpec: QuestionSpecRow[];
  sourceMaterial?: string;
}
