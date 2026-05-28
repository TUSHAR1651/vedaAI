/** Strongly-typed job payloads shared between producers and processors. */

export interface GenerateFullPaperJob {
  assignmentId: string;
}

export interface RegenerateSectionJob {
  assignmentId: string;
  paperId: string;
  sectionIndex: number;
}

export interface ExportPdfJob {
  assignmentId: string;
  paperId: string;
}
