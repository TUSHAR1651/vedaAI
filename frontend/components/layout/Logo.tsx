import { GraduationCap } from 'lucide-react';

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white">
        <GraduationCap className="h-4.5 w-4.5" strokeWidth={2.25} />
      </span>
      {!collapsed && (
        <span className="text-[17px] font-semibold tracking-tight text-ink">
          Veda<span className="text-brand-600">AI</span>
        </span>
      )}
    </div>
  );
}
