'use client';

import { useEffect } from 'react';
import { getSocket, WS_EVENTS } from '@/lib/socket';
import { useGenerationStore } from '@/store/generation-store';
import { assignmentService } from '@/services/assignment.service';
import type {
  GenerationCompletedPayload,
  GenerationFailedPayload,
  PdfCompletedPayload,
  ProgressPayload,
} from '@/types';

/**
 * Subscribes to all real-time updates for one assignment and keeps the Zustand
 * store in sync. Also bootstraps initial state from the REST API so a page
 * refresh (or joining late) recovers the current status / completed paper —
 * the websocket carries live deltas, REST carries the snapshot.
 */
export function useGeneration(assignmentId: string) {
  const store = useGenerationStore();

  useEffect(() => {
    if (!assignmentId) return;

    useGenerationStore.getState().init(assignmentId);
    const socket = getSocket();

    const join = () => {
      useGenerationStore.getState().setConnected(true);
      socket.emit(WS_EVENTS.JOIN_ASSIGNMENT, { assignmentId });
    };

    const onProgress = (p: ProgressPayload) => {
      if (p.assignmentId === assignmentId) useGenerationStore.getState().setProgress(p);
    };
    const onStarted = () => useGenerationStore.getState().setStatus('processing');
    const onCompleted = (p: GenerationCompletedPayload) => {
      if (p.assignmentId === assignmentId) useGenerationStore.getState().setPaper(p.paper);
    };
    const onFailed = (p: GenerationFailedPayload) => {
      if (p.assignmentId === assignmentId)
        useGenerationStore.getState().setError(p.message, p.errors);
    };
    const onPdfStarted = () => useGenerationStore.getState().setPdf({ status: 'processing' });
    const onPdfCompleted = (p: PdfCompletedPayload) => {
      if (p.assignmentId === assignmentId)
        useGenerationStore.getState().setPdf({ status: 'ready', url: p.url, fileName: p.fileName });
    };
    const onPdfFailed = (p: { assignmentId: string; message: string }) => {
      if (p.assignmentId === assignmentId)
        useGenerationStore.getState().setPdf({ status: 'failed', error: p.message });
    };
    const onDisconnect = () => useGenerationStore.getState().setConnected(false);

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on(WS_EVENTS.GENERATION_STARTED, onStarted);
    socket.on(WS_EVENTS.GENERATION_PROGRESS, onProgress);
    socket.on(WS_EVENTS.GENERATION_COMPLETED, onCompleted);
    socket.on(WS_EVENTS.GENERATION_FAILED, onFailed);
    socket.on(WS_EVENTS.PDF_STARTED, onPdfStarted);
    socket.on(WS_EVENTS.PDF_COMPLETED, onPdfCompleted);
    socket.on(WS_EVENTS.PDF_FAILED, onPdfFailed);

    if (socket.connected) join();

    // Snapshot bootstrap — covers refreshes and "already done" cases.
    (async () => {
      try {
        const status = await assignmentService.getStatus(assignmentId);
        const s = useGenerationStore.getState();
        if (status.progress) s.setProgress({ assignmentId, ...status.progress });
        s.setStatus(status.status);
        if (status.status === 'failed' && status.errorMessage) {
          s.setError(status.errorMessage);
        }
        if (status.status === 'completed') {
          const paper = await assignmentService.getPaper(assignmentId);
          s.setPaper(paper);
          if (paper.pdfUrl) {
            s.setPdf({ status: 'ready', url: paper.pdfUrl, fileName: paper.pdfFileName ?? undefined });
          }
        }
      } catch {
        // status endpoint 404 etc. — the live socket will fill in soon.
      }
    })();

    return () => {
      socket.emit(WS_EVENTS.LEAVE_ASSIGNMENT, { assignmentId });
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off(WS_EVENTS.GENERATION_STARTED, onStarted);
      socket.off(WS_EVENTS.GENERATION_PROGRESS, onProgress);
      socket.off(WS_EVENTS.GENERATION_COMPLETED, onCompleted);
      socket.off(WS_EVENTS.GENERATION_FAILED, onFailed);
      socket.off(WS_EVENTS.PDF_STARTED, onPdfStarted);
      socket.off(WS_EVENTS.PDF_COMPLETED, onPdfCompleted);
      socket.off(WS_EVENTS.PDF_FAILED, onPdfFailed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  return store;
}
