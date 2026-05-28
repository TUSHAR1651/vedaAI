import { FileSearch } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <FileSearch className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold text-ink">No assignments yet</h2>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        Create your first AI-generated assignment — set question types, marks
        and time allowed, and we’ll produce a school-branded question paper for
        you in seconds.
      </p>
      <Link
        href="/create"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-card hover:bg-ink-soft"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/90">
          +
        </span>
        Create Your First Assignment
      </Link>
    </div>
  );
}
