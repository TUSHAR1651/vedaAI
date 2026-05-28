'use client';

import { Loader2, RotateCw } from 'lucide-react';
import type { GeneratedPaper } from '@/types';
import { StudentInfo } from '@/components/StudentInfo';
import { QuestionCard } from '@/components/QuestionCard';
import { AnswerKey } from '@/components/AnswerKey';
import { assignmentService } from '@/services/assignment.service';
import { useGenerationStore } from '@/store/generation-store';

interface Props {
  paper: GeneratedPaper;
  assignmentId: string;
}

/**
 * The school-branded question paper rendered from structured data — never from
 * raw model text. Header block uses values attached server-side (school from
 * the static profile, the rest from the assignment), so the layout never
 * depends on the AI getting them right.
 */
export function PaperView({ paper, assignmentId }: Props) {
  const { regeneratingSection, setRegeneratingSection } = useGenerationStore();

  const handleRegenerateSection = async (index: number) => {
    setRegeneratingSection(index);
    try {
      await assignmentService.regenerateSection(assignmentId, index);
    } catch {
      setRegeneratingSection(null);
    }
  };

  let runningNumber = 0;

  return (
    <article className="paper-sheet mx-auto max-w-3xl animate-fade-in overflow-hidden">
      {/* School-branded header */}
      <header className="mx-6 mt-6 rounded-md border-2 border-brand-500 px-5 py-3 text-center">
        <h1 className="text-lg font-bold tracking-tight text-ink">{paper.schoolName}</h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          Subject: <span className="font-medium text-ink-soft">{paper.subject || '—'}</span>
          <span className="mx-3 text-ink-faint">|</span>
          Class: <span className="font-medium text-ink-soft">{paper.className || '—'}</span>
        </p>
      </header>

      <div className="px-6 pb-6 pt-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-muted">
          <span>
            Time Allowed:{' '}
            <span className="font-medium text-ink-soft">
              {paper.timeAllowedMinutes} minutes
            </span>
          </span>
          <span>
            Maximum Marks:{' '}
            <span className="font-medium text-ink-soft">{paper.totalMarks}</span>
          </span>
        </div>
        <p className="mt-2 text-[12px] italic text-ink-muted">
          All questions are compulsory unless stated otherwise.
        </p>

        <div className="mt-4">
          <StudentInfo />
        </div>

        {paper.sections.map((section, sIndex) => {
          const sectionMarks = section.questions.reduce((s, q) => s + q.marks, 0);
          const isRegenerating = regeneratingSection === sIndex;
          return (
            <section key={`${section.title}-${sIndex}`} className="relative mt-6">
              <div className="mb-1 flex items-center justify-between gap-3 border-b border-surface-border pb-1.5">
                <div>
                  <h2 className="text-[15px] font-bold text-brand-700">{section.title}</h2>
                  {section.instruction && (
                    <p className="text-[12px] italic text-ink-muted">
                      {section.instruction}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-[11px] font-medium text-ink-faint">
                    {sectionMarks} marks
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRegenerateSection(sIndex)}
                    disabled={isRegenerating}
                    className="no-print inline-flex items-center gap-1.5 rounded-md border border-surface-border px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-surface-page disabled:opacity-60"
                    title="Regenerate this section"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCw className="h-3 w-3" />
                    )}
                    Regenerate
                  </button>
                </div>
              </div>

              <div className="divide-y divide-surface-border">
                {section.questions.map((q) => {
                  runningNumber += 1;
                  const key = `q-${sIndex}-${runningNumber}`;
                  return <QuestionCard key={key} question={q} number={runningNumber} />;
                })}
              </div>

              {isRegenerating && (
                <div className="absolute inset-0 -m-2 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]">
                  <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-brand-700 shadow-pop ring-1 ring-surface-border">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating section…
                  </span>
                </div>
              )}
            </section>
          );
        })}

        <p className="mt-6 text-center text-[12px] font-bold uppercase tracking-wider text-ink-muted">
          — End of Question Paper —
        </p>

        <AnswerKey paper={paper} />
      </div>
    </article>
  );
}
