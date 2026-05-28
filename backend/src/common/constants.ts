/** BullMQ queue names — referenced by producers, processors and the dashboard. */
export const QUEUES = {
  QUESTION_GENERATION: 'question-generation',
  PDF_GENERATION: 'pdf-generation',
} as const;

/** Job names within the question-generation queue. */
export const GENERATION_JOBS = {
  FULL_PAPER: 'generate-full-paper',
  SINGLE_SECTION: 'regenerate-section',
} as const;

export const PDF_JOBS = {
  EXPORT_PAPER: 'export-paper-pdf',
} as const;

/** Lifecycle status shared by Assignment docs and Redis status keys. */
export const GENERATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type GenerationStatus = (typeof GENERATION_STATUS)[keyof typeof GENERATION_STATUS];

/** Standard pipeline stages — drive the live progress bar on the client. */
export const PROGRESS_STAGES = {
  PARSING: { stage: 'parsing', label: 'Parsing assignment', progress: 10 },
  GENERATING_SECTIONS: { stage: 'sections', label: 'Generating sections', progress: 40 },
  GENERATING_QUESTIONS: { stage: 'questions', label: 'Generating questions', progress: 70 },
  VALIDATING: { stage: 'validating', label: 'Validating structured output', progress: 85 },
  FINALIZING: { stage: 'finalizing', label: 'Finalizing paper', progress: 95 },
} as const;

/** Redis key helpers — `assignment:<id>:status`, `assignment:<id>:progress`. */
export const redisKeys = {
  status: (assignmentId: string) => `assignment:${assignmentId}:status`,
  progress: (assignmentId: string) => `assignment:${assignmentId}:progress`,
  promptCache: (hash: string) => `prompt:cache:${hash}`,
};

/** BullMQ default job options — attempts: 3 with exponential backoff (spec). */
export const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 24 * 3600 },
};
