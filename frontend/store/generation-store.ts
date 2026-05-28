import { create } from 'zustand';
import type {
  GeneratedPaper,
  GenerationStatus,
  ProgressEvent,
} from '@/types';

type PdfState = {
  status: 'idle' | 'processing' | 'ready' | 'failed';
  url?: string;
  fileName?: string;
  error?: string;
};

interface GenerationState {
  assignmentId: string | null;
  status: GenerationStatus;
  connected: boolean;
  progress: ProgressEvent | null;
  paper: GeneratedPaper | null;
  error: { message: string; errors?: string[] } | null;
  /** Index of a section currently being regenerated, or null. */
  regeneratingSection: number | null;
  pdf: PdfState;

  // ---- actions ----
  init: (assignmentId: string) => void;
  /** Clear the paper and flip to "processing" — used for a full regenerate. */
  beginFullGeneration: () => void;
  reset: () => void;
  setConnected: (connected: boolean) => void;
  setStatus: (status: GenerationStatus) => void;
  setProgress: (progress: ProgressEvent) => void;
  setPaper: (paper: GeneratedPaper) => void;
  setError: (message: string, errors?: string[]) => void;
  setRegeneratingSection: (index: number | null) => void;
  setPdf: (pdf: Partial<PdfState>) => void;
}

const initialPdf: PdfState = { status: 'idle' };

export const useGenerationStore = create<GenerationState>((set) => ({
  assignmentId: null,
  status: 'pending',
  connected: false,
  progress: null,
  paper: null,
  error: null,
  regeneratingSection: null,
  pdf: initialPdf,

  init: (assignmentId) =>
    set({
      assignmentId,
      status: 'pending',
      progress: null,
      paper: null,
      error: null,
      regeneratingSection: null,
      pdf: initialPdf,
    }),

  beginFullGeneration: () =>
    set({
      status: 'processing',
      paper: null,
      progress: null,
      error: null,
      regeneratingSection: null,
      pdf: initialPdf,
    }),

  reset: () =>
    set({
      assignmentId: null,
      status: 'pending',
      progress: null,
      paper: null,
      error: null,
      regeneratingSection: null,
      pdf: initialPdf,
    }),

  setConnected: (connected) => set({ connected }),

  setStatus: (status) => set({ status }),

  setProgress: (progress) => set({ progress, status: 'processing' }),

  setPaper: (paper) =>
    set({
      paper,
      status: 'completed',
      error: null,
      regeneratingSection: null,
      // a fresh paper invalidates any previously generated PDF
      pdf: initialPdf,
    }),

  setError: (message, errors) =>
    set({ error: { message, errors }, status: 'failed', regeneratingSection: null }),

  setRegeneratingSection: (index) => set({ regeneratingSection: index }),

  setPdf: (pdf) => set((s) => ({ pdf: { ...s.pdf, ...pdf } })),
}));
