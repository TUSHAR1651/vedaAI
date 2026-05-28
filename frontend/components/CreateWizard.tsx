'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';
import { FileUpload } from '@/components/FileUpload';
import { QuestionTypeTable } from '@/components/QuestionTypeTable';
import {
  CreateAssignmentInput,
  DEFAULT_FORM_VALUES,
  computeTotals,
  createAssignmentSchema,
} from '@/lib/validation';
import { QUESTION_TYPE_LABELS } from '@/types';
import { assignmentService } from '@/services/assignment.service';

const STEPS = [{ label: 'Assignment Details' }, { label: 'Review & Generate' }];

export function CreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<CreateAssignmentInput>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onBlur',
  });
  const { handleSubmit, formState, trigger } = methods;

  const goNext = async () => {
    const ok = await trigger([
      'title',
      'subject',
      'className',
      'dueDate',
      'timeAllowedMinutes',
      'questionSpec',
    ]);
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const a = await assignmentService.create(values);
      router.push(`/papers/${a._id}`);
    } catch (e) {
      setSubmitError((e as Error).message || 'Failed to create assignment');
    }
  });

  return (
    <FormProvider {...methods}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Stepper steps={STEPS} current={step} />
        </div>

        <div className="rounded-2xl bg-white p-5 sm:p-7 shadow-card">
          {step === 0 && <StepDetails />}
          {step === 1 && <StepReview />}

          {submitError && (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-surface-border pt-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-page disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink-soft"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={formState.isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Paper
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

// ---------- Steps (extracted so they aren't recreated on every render) ----------

function StepDetails() {
  const { register, control, formState } = useFormContext<CreateAssignmentInput>();
  return (
    <>
      <h2 className="text-lg font-semibold text-ink">Assignment Details</h2>
      <p className="mt-0.5 text-sm text-ink-muted">Tell us about your assignment.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Title"
          name="title"
          placeholder="e.g. Chemistry — Electrolysis Quiz"
          register={register}
          error={formState.errors.title?.message}
          full
        />
        <Field
          label="Subject"
          name="subject"
          placeholder="e.g. Science"
          register={register}
          error={formState.errors.subject?.message}
        />
        <Field
          label="Class"
          name="className"
          placeholder="e.g. 8 / 5th"
          register={register}
          error={formState.errors.className?.message}
        />
        <Field
          label="Due Date"
          name="dueDate"
          type="date"
          register={register}
          error={formState.errors.dueDate?.message}
        />
        <Field
          label="Time Allowed (minutes)"
          name="timeAllowedMinutes"
          type="number"
          registerOptions={{ valueAsNumber: true }}
          register={register}
          error={formState.errors.timeAllowedMinutes?.message}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-ink">
          Upload Reference Material (optional)
        </div>
        <Controller
          control={control}
          name="sourceMaterial"
          render={({ field }) => <FileUpload onExtracted={(t) => field.onChange(t)} />}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-ink">Question Types</div>
        <QuestionTypeTable />
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Additional Information (for better output)
        </label>
        <textarea
          rows={4}
          {...register('instructions')}
          placeholder="e.g. Cover chapters 4–6, emphasise application-based questions, keep language simple."
          className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {formState.errors.instructions?.message && (
          <p className="mt-1 text-xs text-rose-600">{formState.errors.instructions.message}</p>
        )}
      </div>
    </>
  );
}

function StepReview() {
  const { watch } = useFormContext<CreateAssignmentInput>();
  const v = watch();
  const { totalQuestions, totalMarks } = computeTotals(v.questionSpec);
  return (
    <>
      <h2 className="text-lg font-semibold text-ink">Review & Generate</h2>
      <p className="mt-0.5 text-sm text-ink-muted">
        Confirm the details — the AI will produce a structured paper you can edit or
        regenerate at any time.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Summary label="Title" value={v.title} />
        <Summary label="Subject" value={v.subject} />
        <Summary label="Class" value={v.className} />
        <Summary
          label="Due Date"
          value={v.dueDate ? new Date(v.dueDate).toLocaleDateString() : '—'}
        />
        <Summary label="Time Allowed" value={`${v.timeAllowedMinutes} minutes`} />
        <Summary
          label="Reference Material"
          value={
            v.sourceMaterial ? `${v.sourceMaterial.length.toLocaleString()} chars` : 'None'
          }
        />
      </dl>

      <div className="mt-5 rounded-lg border border-surface-border">
        <div className="border-b border-surface-border bg-surface-page px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          Question Plan
        </div>
        <ul className="divide-y divide-surface-border">
          {v.questionSpec.map((row, i) => (
            <li
              key={`${row.type}-${i}`}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-ink">
                Section {String.fromCharCode(65 + i)} · {QUESTION_TYPE_LABELS[row.type]}
              </span>
              <span className="text-ink-muted">
                {row.count} × {row.marks} = <strong>{row.count * row.marks}</strong> marks
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-end gap-5 border-t border-surface-border bg-surface-page px-3 py-2 text-xs text-ink-muted">
          <span>
            Total Questions: <strong className="text-ink">{totalQuestions}</strong>
          </span>
          <span>
            Total Marks: <strong className="text-ink">{totalMarks}</strong>
          </span>
        </div>
      </div>

      {v.instructions && (
        <div className="mt-5">
          <div className="text-sm font-medium text-ink">Additional Instructions</div>
          <p className="mt-1 whitespace-pre-line rounded-md bg-surface-page p-3 text-sm text-ink-soft">
            {v.instructions}
          </p>
        </div>
      )}
    </>
  );
}

// ---------- small inline UI primitives ----------
function Field({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  registerOptions,
  error,
  full,
}: {
  label: string;
  name: keyof CreateAssignmentInput;
  type?: string;
  placeholder?: string;
  register: any;
  registerOptions?: any;
  error?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name, registerOptions)}
        className="w-full rounded-md border border-surface-border bg-white px-3 py-2 text-sm placeholder:text-ink-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value || '—'}</dd>
    </div>
  );
}
