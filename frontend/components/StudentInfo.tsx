/**
 * Blank lines a student fills in by hand — Name, Roll No., Class, Section.
 * Mirrors the layout used in the PDF document.
 */
export function StudentInfo() {
  const fields = [
    { label: 'Name', w: 'w-56' },
    { label: 'Roll No.', w: 'w-28' },
    { label: 'Class', w: 'w-20' },
    { label: 'Section', w: 'w-20' },
  ];
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-dashed border-surface-border pb-4 text-sm">
      {fields.map((f) => (
        <div key={f.label} className="flex items-end gap-2">
          <span className="text-ink-muted">{f.label}:</span>
          <span className={`${f.w} h-4 border-b border-ink/60 leading-none`} />
        </div>
      ))}
    </div>
  );
}
