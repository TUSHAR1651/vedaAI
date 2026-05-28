import type { GeneratedPaper } from '@/types';

/** Numbered list of answers, running across all sections. */
export function AnswerKey({ paper }: { paper: GeneratedPaper }) {
  let n = 0;
  return (
    <section className="mt-6 border-t-2 border-ink/20 pt-4">
      <h3 className="mb-2 text-base font-bold text-ink">Answer Key</h3>
      <ol className="space-y-1.5 text-sm text-ink-soft">
        {paper.sections.flatMap((s) =>
          s.questions.map((q) => {
            n += 1;
            return (
              <li key={`${s.title}-${n}`} className="flex gap-2">
                <span className="w-6 shrink-0 font-semibold text-ink">{n}.</span>
                <span className="leading-relaxed">{q.answer}</span>
              </li>
            );
          }),
        )}
      </ol>
    </section>
  );
}
