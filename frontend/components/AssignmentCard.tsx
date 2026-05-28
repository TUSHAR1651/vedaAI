'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { Assignment } from '@/types';

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<Assignment['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing: 'bg-sky-50 text-sky-700 ring-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const STATUS_DOT: Record<Assignment['status'], string> = {
  pending: 'bg-amber-500',
  processing: 'bg-sky-500',
  completed: 'bg-emerald-500',
  failed: 'bg-rose-500',
};

interface Props {
  assignment: Assignment;
  onDelete: (id: string) => void;
}

export function AssignmentCard({ assignment, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="group relative rounded-xl bg-white shadow-card transition hover:shadow-pop">
      {/* Context menu — owns the top-right slot exclusively */}
      <div ref={ref} className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setOpen((s) => !s);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-page"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-8 w-44 overflow-hidden rounded-md bg-white shadow-pop ring-1 ring-surface-border">
            <Link
              href={`/papers/${assignment._id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-page"
            >
              <Eye className="h-4 w-4 text-ink-muted" />
              View Assignment
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete(assignment._id);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      <Link
        href={`/papers/${assignment._id}`}
        className="block px-5 pt-5 pb-4"
        aria-label={`Open ${assignment.title}`}
      >
        {/* `pr-9` reserves the kebab button's column so the title never sits under it. */}
        <h3 className="pr-9 text-[15px] font-semibold leading-tight text-ink line-clamp-2">
          {assignment.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
          <span>
            <span className="font-medium text-ink-soft">Assigned on:</span>{' '}
            {fmt(assignment.createdAt)}
          </span>
          <span>
            <span className="font-medium text-ink-soft">Due:</span>{' '}
            {fmt(assignment.dueDate)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-ink-muted">
            <span>{assignment.subject}</span>
            <span className="text-ink-faint">•</span>
            <span>Class {assignment.className}</span>
            <span className="text-ink-faint">•</span>
            <span>
              {assignment.totalQuestions} Qs · {assignment.totalMarks} marks
            </span>
          </div>
          <span
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset capitalize',
              STATUS_STYLES[assignment.status],
            )}
          >
            <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_DOT[assignment.status])} />
            {assignment.status}
          </span>
        </div>
      </Link>
    </div>
  );
}
