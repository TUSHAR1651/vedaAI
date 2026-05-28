'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { AssignmentCard } from '@/components/AssignmentCard';
import { EmptyState } from '@/components/EmptyState';
import { assignmentService } from '@/services/assignment.service';
import type { Assignment } from '@/types';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await assignmentService.list();
      setAssignments(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load assignments');
      setAssignments([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!assignments) return [];
    const q = query.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.className.toLowerCase().includes(q),
    );
  }, [assignments, query]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this assignment? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await assignmentService.remove(id);
      setAssignments((prev) => prev?.filter((a) => a._id !== id) ?? null);
    } catch (e) {
      alert((e as Error).message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }, []);

  if (assignments === null) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader query={query} setQuery={setQuery} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-white shimmer shadow-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader query={query} setQuery={setQuery} />

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-white py-16 text-center text-sm text-ink-muted">
          No assignments match “{query}”.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <div
              key={a._id}
              className={deleting === a._id ? 'pointer-events-none opacity-50' : ''}
            >
              <AssignmentCard assignment={a} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {/* Floating create button on mobile (sidebar covers desktop). */}
      <Link
        href="/create"
        className="lg:hidden fixed right-4 bottom-20 z-20 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white shadow-pop"
      >
        <Plus className="h-4 w-4" /> Create
      </Link>
    </div>
  );
}

function PageHeader({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Assignments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Create, generate and download AI-powered question papers.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assignments"
            className="w-full sm:w-64 rounded-md border border-surface-border bg-white pl-8 pr-8 py-2 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Link
          href="/create"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white shadow-card hover:bg-ink-soft"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/90">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          Create Assignment
        </Link>
      </div>
    </div>
  );
}
