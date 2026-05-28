'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenText,
  Bot,
  Home,
  Library,
  Plus,
  Settings,
  Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from './Logo';
import { PROFILE } from '@/lib/profile';

/**
 * Persistent dashboard sidebar (desktop only — the mobile shell uses a
 * bottom tab bar instead). Only "Assignments" + the Create button are
 * functional; the other nav items are styled placeholders so the IA in the
 * Figma is faithfully represented.
 */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Placeholders are non-clickable and render as muted to set expectations. */
  disabled?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Home', href: '#', icon: Home, disabled: true },
  { label: 'My Groups', href: '#', icon: Users, disabled: true },
  { label: 'Assignments', href: '/', icon: BookOpenText },
  { label: "AI Teacher's Toolkit", href: '#', icon: Bot, disabled: true },
  { label: 'My Library', href: '#', icon: Library, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const isAssignmentsRoute = pathname === '/' || pathname.startsWith('/papers');

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[256px] shrink-0 flex-col self-start overflow-y-auto border-r border-surface-border bg-white">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>

      {/* Primary CTA */}
      <div className="px-3">
        <Link
          href="/create"
          className="group flex items-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-ink-soft"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/90 text-white">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          Create Assignment
        </Link>
      </div>

      {/* Nav */}
      <nav className="mt-6 flex-1 px-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive =
              !item.disabled &&
              (item.href === '/'
                ? isAssignmentsRoute
                : pathname === item.href || pathname.startsWith(item.href + '/'));
            const inner = (
              <span
                className={clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                  item.disabled
                    ? 'cursor-not-allowed text-ink-faint'
                    : isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-ink-soft hover:bg-surface-page',
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.disabled && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-ink-faint">
                    Soon
                  </span>
                )}
              </span>
            );
            return (
              <li key={item.label}>
                {item.disabled ? (
                  <div aria-disabled="true" title="Coming soon">
                    {inner}
                  </div>
                ) : (
                  <Link href={item.href}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings + profile */}
      <div className="border-t border-surface-border px-2 py-3">
        <div className="mb-2 px-1">
          <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-faint cursor-not-allowed">
            <Settings className="h-4.5 w-4.5" />
            Settings
          </span>
        </div>
        <ProfileCard />
      </div>
    </aside>
  );
}

function ProfileCard() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-page px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
        {PROFILE.teacherName
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join('')}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink">
          {PROFILE.schoolName}
        </div>
        <div className="truncate text-[11px] text-ink-muted">
          {PROFILE.schoolAddress}
        </div>
      </div>
    </div>
  );
}
