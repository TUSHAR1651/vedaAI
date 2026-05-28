'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpenText, Bot, Home, Library, Plus, Users } from 'lucide-react';
import { clsx } from 'clsx';

/** Bottom tab bar for mobile (the sidebar collapses on small screens). */
type Tab = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  primary?: boolean;
};

const TABS: Tab[] = [
  { label: 'Home', href: '#', icon: Home, disabled: true },
  { label: 'Groups', href: '#', icon: Users, disabled: true },
  { label: 'Create', href: '/create', icon: Plus, primary: true },
  { label: 'Assignments', href: '/', icon: BookOpenText },
  { label: 'Library', href: '#', icon: Library, disabled: true },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-surface-border bg-white">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const isActive =
            !t.disabled &&
            (t.href === '/' ? pathname === '/' || pathname.startsWith('/papers') : pathname.startsWith(t.href));
          const Inner = (
            <span
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 text-[11px]',
                t.disabled ? 'text-ink-faint' : isActive ? 'text-brand-700' : 'text-ink-muted',
                t.primary && 'relative',
              )}
            >
              {t.primary ? (
                <span className="-mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white shadow-pop">
                  <t.icon className="h-5 w-5" />
                </span>
              ) : (
                <t.icon className="h-5 w-5" />
              )}
              <span className={clsx(t.primary && 'pt-0.5')}>{t.label}</span>
            </span>
          );
          return (
            <li key={t.label}>
              {t.disabled ? (
                <div aria-disabled="true">{Inner}</div>
              ) : (
                <Link href={t.href}>{Inner}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
