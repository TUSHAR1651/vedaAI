/**
 * Websocket event contract shared (conceptually) with the frontend.
 * Keeping the names here means producers can't typo an event string.
 */
export const WS_EVENTS = {
  // Client -> Server
  JOIN_ASSIGNMENT: 'join_assignment',
  LEAVE_ASSIGNMENT: 'leave_assignment',

  // Server -> Client
  GENERATION_STARTED: 'generation_started',
  GENERATION_PROGRESS: 'generation_progress',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',

  PDF_STARTED: 'pdf_started',
  PDF_COMPLETED: 'pdf_completed',
  PDF_FAILED: 'pdf_failed',
} as const;

/** Socket.io room per assignment — all updates for one paper are scoped here. */
export const assignmentRoom = (assignmentId: string) => `assignment:${assignmentId}`;

export interface ProgressPayload {
  assignmentId: string;
  stage: string;
  label: string;
  progress: number; // 0..100
}

export interface GenerationCompletedPayload {
  assignmentId: string;
  paperId: string;
  paper: unknown; // validated GeneratedPaperContract + persisted ids
}

export interface GenerationFailedPayload {
  assignmentId: string;
  message: string;
  errors?: string[];
}

export interface PdfCompletedPayload {
  assignmentId: string;
  paperId: string;
  url: string;
  fileName: string;
}
