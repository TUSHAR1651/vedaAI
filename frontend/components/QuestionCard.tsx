import { QUESTION_TYPE_LABELS, type Question } from '@/types';

interface Props {
  question: Question;
  number: number;
}

export function QuestionCard({ question, number }: Props) {
  return (
    <div className="flex gap-3 py-3">
      <span className="w-6 shrink-0 text-sm font-semibold text-ink-faint">{number}.</span>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] leading-relaxed text-ink-soft">{question.question}</p>
          <span className="shrink-0 text-sm font-semibold text-ink-muted">
            [{question.marks}]
          </span>
        </div>

        {question.options && question.options.length > 0 && (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {question.options.map((opt, i) => (
              <li key={`opt-${i}`} className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-surface-border text-[11px] font-medium text-ink-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1.5">
          <span className="text-[10px] uppercase tracking-wide text-ink-faint">
            {QUESTION_TYPE_LABELS[question.type] ?? question.type}
          </span>
        </div>
      </div>
    </div>
  );
}
