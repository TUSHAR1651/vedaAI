import { clsx } from 'clsx';

export function Stepper({
  steps,
  current,
}: {
  steps: { label: string }[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'pending';
        return (
          <li key={s.label} className="flex items-center gap-2 sm:gap-3">
            <span
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset',
                state === 'done' && 'bg-brand-500 text-white ring-brand-500',
                state === 'active' && 'bg-ink text-white ring-ink',
                state === 'pending' && 'bg-white text-ink-muted ring-surface-border',
              )}
            >
              {i + 1}
            </span>
            <span
              className={clsx(
                'text-sm',
                state === 'pending' ? 'text-ink-muted' : 'text-ink font-medium',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="hidden sm:block h-px w-8 bg-surface-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
