'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import type { CreateAssignmentInput } from '@/lib/validation';
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, QuestionType } from '@/types';
import { computeTotals } from '@/lib/validation';

/**
 * The table at the heart of the create wizard: one row per question type, with
 * per-type count + marks-per-question. Live totals (Total Questions / Total
 * Marks) re-compute on every keystroke and feed the review step + the
 * generation request.
 */
export function QuestionTypeTable() {
  const { control, register, watch, formState } = useFormContext<CreateAssignmentInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'questionSpec' });

  const rows = watch('questionSpec') || [];
  const usedTypes = new Set(rows.map((r) => r.type));
  const availableTypes = QUESTION_TYPES.filter((t) => !usedTypes.has(t));
  const { totalQuestions, totalMarks } = computeTotals(rows);
  const arrayError = formState.errors.questionSpec as { message?: string; root?: { message?: string } } | undefined;

  const addNext = () => {
    const next = availableTypes[0] ?? null;
    if (!next) return;
    append({ type: next, count: 5, marks: 1 });
  };

  return (
    <div className="rounded-lg border border-surface-border bg-white">
      <div className="grid grid-cols-12 gap-2 border-b border-surface-border bg-surface-page px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        <div className="col-span-7">Question Type</div>
        <div className="col-span-2 text-center">No. of Questions</div>
        <div className="col-span-2 text-center">Marks / Q</div>
        <div className="col-span-1" />
      </div>

      <ul className="divide-y divide-surface-border">
        {fields.map((field, index) => {
          const row = rows[index];
          const otherTaken = new Set(rows.filter((_, i) => i !== index).map((r) => r.type));
          const typeOptions: QuestionType[] = QUESTION_TYPES.filter((t) => !otherTaken.has(t));
          const countError = formState.errors.questionSpec?.[index]?.count?.message as string | undefined;
          const marksError = formState.errors.questionSpec?.[index]?.marks?.message as string | undefined;

          return (
            <li key={field.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5">
              <div className="col-span-7">
                <Controller
                  control={control}
                  name={`questionSpec.${index}.type` as const}
                  render={({ field: f }) => (
                    <select
                      {...f}
                      className="w-full rounded-md border border-surface-border bg-white px-2.5 py-1.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>
                          {QUESTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="w-full rounded-md border border-surface-border px-2 py-1.5 text-sm text-center focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  {...register(`questionSpec.${index}.count` as const, { valueAsNumber: true })}
                />
                {countError && <p className="mt-1 text-[10px] text-rose-600">{countError}</p>}
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="w-full rounded-md border border-surface-border px-2 py-1.5 text-sm text-center focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  {...register(`questionSpec.${index}.marks` as const, { valueAsNumber: true })}
                />
                {marksError && <p className="mt-1 text-[10px] text-rose-600">{marksError}</p>}
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="text-ink-faint hover:text-rose-600 disabled:opacity-30"
                  aria-label="Remove question type"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-surface-border px-3 py-2.5">
        <button
          type="button"
          onClick={addNext}
          disabled={availableTypes.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-brand-300 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus className="h-3.5 w-3.5" /> Add Question Type
        </button>
        <div className="flex items-center gap-5 text-xs text-ink-muted">
          <span>
            Total Questions:{' '}
            <span className="font-semibold text-ink">{totalQuestions}</span>
          </span>
          <span>
            Total Marks: <span className="font-semibold text-ink">{totalMarks}</span>
          </span>
        </div>
      </div>

      {arrayError?.message && (
        <p className="border-t border-surface-border bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {arrayError.message}
        </p>
      )}
      {arrayError?.root?.message && (
        <p className="border-t border-surface-border bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
          {arrayError.root.message}
        </p>
      )}
    </div>
  );
}
