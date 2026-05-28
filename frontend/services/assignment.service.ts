import { api } from '@/lib/api';
import type { Assignment, GeneratedPaper, StatusResponse } from '@/types';
import type { CreateAssignmentInput } from '@/lib/validation';

/** All assignment-related API calls live here (kept out of components). */
export const assignmentService = {
  create: (input: CreateAssignmentInput) => api.post<Assignment>('/assignments', input),

  list: () => api.get<Assignment[]>('/assignments'),

  getOne: (id: string) => api.get<Assignment>(`/assignments/${id}`),

  remove: (id: string) => api.del<{ deleted: true; id: string }>(`/assignments/${id}`),

  getStatus: (id: string) => api.get<StatusResponse>(`/assignments/${id}/status`),

  getPaper: (id: string) => api.get<GeneratedPaper>(`/assignments/${id}/paper`),

  regeneratePaper: (id: string) =>
    api.post<{ assignmentId: string; jobId: string; status: string }>(
      `/assignments/${id}/regenerate`,
    ),

  regenerateSection: (id: string, index: number) =>
    api.post<{ assignmentId: string; paperId: string; sectionIndex: number; jobId: string }>(
      `/assignments/${id}/sections/${index}/regenerate`,
    ),

  /** Upload a reference file and get extracted text back for `sourceMaterial`. */
  extractText: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<{ fileName: string; characters: number; text: string }>(
      '/pdf/extract-text',
      form,
    );
  },

  /** Request an async PDF export — resolves with the job id; URL arrives via ws. */
  requestPdf: (id: string) =>
    api.post<{ assignmentId: string; paperId: string; jobId: string; status: string }>(
      `/assignments/${id}/pdf`,
    ),
};
