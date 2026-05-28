'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { GenerationProgress } from '@/components/GenerationProgress';
import { PaperView } from '@/components/PaperView';
import { ActionBar } from '@/components/ActionBar';
import { useGeneration } from '@/hooks/useGeneration';
import { assignmentService } from '@/services/assignment.service';
import { useGenerationStore } from '@/store/generation-store';
import { PROFILE } from '@/lib/profile';
import type { Assignment } from '@/types';

export default function PaperPage() {
  const params = useParams<{ assignmentId: string }>();
  const assignmentId = params.assignmentId;
  const { status, progress, paper, error, connected } = useGeneration(assignmentId);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  // Load the assignment record once (for the AI intro line: subject / class).
  useEffect(() => {
    let cancelled = false;
    assignmentService
      .getOne(assignmentId)
      .then((a) => !cancelled && setAssignment(a))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const retry = async () => {
    await assignmentService.regeneratePaper(assignmentId);
    useGenerationStore.getState().beginFullGeneration();
  };

  const showError = status === 'failed' && !paper;
  const showProgress = !paper && !showError;
  const showPaper = !!paper;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-5 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        {showPaper && <ActionBar assignmentId={assignmentId} />}
      </div>

      {/* AI intro line — only shown alongside a generated paper */}
      {showPaper && assignment && (
        <div className="no-print mb-4 flex items-start gap-3 rounded-xl bg-white p-4 shadow-card animate-fade-in">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed text-ink-soft">
            Certainly, <span className="font-semibold text-ink">{PROFILE.teacherName}</span>! Here
            is your customized question paper for{' '}
            <span className="font-medium text-ink">{assignment.subject}</span>, Class{' '}
            <span className="font-medium text-ink">{assignment.className}</span> — covering{' '}
            {assignment.totalQuestions} questions worth {assignment.totalMarks} marks.
          </p>
        </div>
      )}

      {/* Failed */}
      {showError && (
        <div className="mx-auto max-w-xl animate-fade-in rounded-2xl border border-rose-200 bg-rose-50 p-7 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
          <h2 className="text-lg font-semibold text-rose-800">Generation failed</h2>
          <p className="mt-1 text-sm text-rose-700">
            {error?.message ?? 'The AI output could not be validated after several attempts.'}
          </p>
          {error?.errors && error.errors.length > 0 && (
            <ul className="mx-auto mt-3 max-w-md space-y-1 rounded-lg bg-white/70 p-3 text-left text-xs text-rose-600">
              {error.errors.slice(0, 5).map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {showProgress && (
        <GenerationProgress status={status} progress={progress} connected={connected} />
      )}

      {showPaper && <PaperView paper={paper!} assignmentId={assignmentId} />}
    </div>
  );
}
