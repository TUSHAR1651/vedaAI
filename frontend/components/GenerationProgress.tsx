'use client';

import { Check, Loader2, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import type { GenerationStatus, ProgressEvent } from '@/types';

const STAGES = [
  { key: 'parsing', label: 'Parsing assignment', at: 10 },
  { key: 'sections', label: 'Generating sections', at: 40 },
  { key: 'questions', label: 'Generating questions', at: 70 },
  { key: 'validating', label: 'Validating structured output', at: 85 },
  { key: 'finalizing', label: 'Finalizing paper', at: 95 },
];

interface Props {
  status: GenerationStatus;
  progress: ProgressEvent | null;
  connected: boolean;
}

export function GenerationProgress({ status, progress, connected }: Props) {
  const pct = progress?.progress ?? (status === 'completed' ? 100 : 5);

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="rounded-2xl bg-white p-7 shadow-card">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">Generating your paper</h2>
              <p className="text-sm text-ink-muted">
                {progress?.label ?? 'Queued — starting shortly…'}
              </p>
            </div>
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              connected ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-page text-ink-muted',
            )}
            title={connected ? 'Live updates connected' : 'Reconnecting…'}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="mb-6">
          <div className="mb-1.5 flex justify-between text-xs font-medium text-ink-muted">
            <span>Progress</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-page">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ol className="space-y-2.5">
          {STAGES.map((stage) => {
            const done = pct >= stage.at;
            const active = !done && pct >= stage.at - 30;
            return (
              <li key={stage.key} className="flex items-center gap-3">
                <span
                  className={clsx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                    done
                      ? 'bg-brand-600 text-white'
                      : active
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-surface-page text-ink-faint',
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={clsx(
                    'text-sm',
                    done ? 'text-ink' : active ? 'font-medium text-brand-700' : 'text-ink-faint',
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
