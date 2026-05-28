'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { PROFILE } from '@/lib/profile';

/**
 * Top app bar — breadcrumb derived from the route, search (decorative for
 * the assignments-only scope), notifications + user identity.
 */
export function Topbar() {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-surface-border bg-white/85 backdrop-blur px-4 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className="px-1.5 text-ink-faint">/</span>}
            {c.href ? (
              <Link href={c.href} className="text-ink-muted hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
          <input
            type="search"
            placeholder="Search assignments"
            className="w-56 rounded-md border border-surface-border bg-white pl-8 pr-3 py-1.5 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <button
          aria-label="Notifications"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-page"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>

        <div className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-page">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
            {PROFILE.teacherName
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <span className="hidden sm:inline text-sm text-ink">{PROFILE.teacherName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-ink-muted" />
        </div>
      </div>
    </header>
  );
}

function breadcrumbsFor(pathname: string): { label: string; href?: string }[] {
  if (pathname === '/') return [{ label: 'Assignments' }];
  if (pathname.startsWith('/create'))
    return [{ label: 'Assignments', href: '/' }, { label: 'Create Assignment' }];
  if (pathname.startsWith('/papers'))
    return [{ label: 'Assignments', href: '/' }, { label: 'Question Paper' }];
  return [{ label: 'Assignments', href: '/' }];
}
