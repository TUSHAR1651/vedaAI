'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileDown, Loader2, RefreshCw } from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { useGenerationStore } from '@/store/generation-store';

/**
 * Top-of-output action bar: regenerate the whole paper, or kick off an async
 * PDF export. The PDF URL arrives via a websocket (`pdf_completed`); we trigger
 * the browser download as soon as that event fires — so the teacher only ever
 * clicks "Download as PDF" once.
 */
export function ActionBar({ assignmentId }: { assignmentId: string }) {
  const { pdf, setPdf, beginFullGeneration } = useGenerationStore();
  const [regenerating, setRegenerating] = useState(false);
  // Tracks "I just requested a PDF" so we only auto-download for a click I
  // initiated (not e.g. a snapshot bootstrap that already had a ready URL).
  const awaitingDownloadRef = useRef(false);
  const lastTriggeredUrlRef = useRef<string | null>(null);

  // When the worker finishes and the URL arrives, kick off the download.
  useEffect(() => {
    if (
      pdf.status === 'ready' &&
      pdf.url &&
      awaitingDownloadRef.current &&
      lastTriggeredUrlRef.current !== pdf.url
    ) {
      awaitingDownloadRef.current = false;
      lastTriggeredUrlRef.current = pdf.url;
      triggerDownload(pdf.url, pdf.fileName);
    }
  }, [pdf.status, pdf.url, pdf.fileName]);

  const handleRegenerate = async () => {
    if (!confirm('Regenerate the entire paper? The current version will be replaced.')) return;
    setRegenerating(true);
    try {
      await assignmentService.regeneratePaper(assignmentId);
      beginFullGeneration();
    } finally {
      setRegenerating(false);
    }
  };

  const handleExport = async () => {
    // If a fresh PDF is already on hand from a previous session, just download.
    if (pdf.status === 'ready' && pdf.url) {
      triggerDownload(pdf.url, pdf.fileName);
      return;
    }
    awaitingDownloadRef.current = true;
    setPdf({ status: 'processing', error: undefined });
    try {
      await assignmentService.requestPdf(assignmentId);
    } catch (e: any) {
      awaitingDownloadRef.current = false;
      setPdf({ status: 'failed', error: e?.message || 'Failed to start PDF export' });
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={regenerating}
        className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-white px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-page disabled:opacity-60"
      >
        {regenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Regenerate Paper
      </button>

      <button
        type="button"
        onClick={handleExport}
        disabled={pdf.status === 'processing'}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pdf.status === 'processing' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Rendering PDF…
          </>
        ) : pdf.status === 'ready' ? (
          <>
            <Check className="h-4 w-4" />
            Download as PDF
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Download as PDF
          </>
        )}
      </button>

      {pdf.status === 'ready' && pdf.url && (
        <a
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          download={pdf.fileName}
          className="text-sm text-brand-700 underline-offset-2 hover:underline"
        >
          <Download className="inline h-3.5 w-3.5 mr-1" /> open
        </a>
      )}

      {pdf.status === 'failed' && (
        <span className="text-sm text-rose-600">{pdf.error ?? 'PDF export failed'}</span>
      )}
    </div>
  );
}

function triggerDownload(url: string, fileName?: string) {
  if (typeof window === 'undefined') return;
  // An invisible <a download> click is the most reliable cross-browser way to
  // start a download without leaving the current page.
  const a = document.createElement('a');
  a.href = url;
  if (fileName) a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
