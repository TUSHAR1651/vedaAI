'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { clsx } from 'clsx';
import { assignmentService } from '@/services/assignment.service';

interface Props {
  /** Called with extracted text (or '' when cleared). */
  onExtracted: (text: string) => void;
}

/**
 * Optional reference upload. The file itself never reaches the assignment
 * record — we extract its text server-side and pass that up as `sourceMaterial`
 * so the AI can ground questions in the provided material.
 */
export function FileUpload({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [info, setInfo] = useState<{ name: string; chars: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setState('loading');
    setError(null);
    try {
      const res = await assignmentService.extractText(file);
      setInfo({ name: res.fileName, chars: res.characters });
      onExtracted(res.text);
      setState('done');
    } catch (e: any) {
      setError(e?.message || 'Failed to read file');
      setState('error');
    }
  };

  const clear = () => {
    setInfo(null);
    setState('idle');
    setError(null);
    onExtracted('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {state === 'done' && info ? (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-brand-700">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{info.name}</span>
            <span className="text-brand-600">
              · {info.chars.toLocaleString()} chars extracted
            </span>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-brand-700 hover:text-brand-900"
            aria-label="Remove uploaded file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={clsx(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : state === 'error'
                ? 'border-rose-300 bg-rose-50'
                : 'border-surface-border bg-surface-alt hover:border-brand-300',
          )}
        >
          {state === 'loading' ? (
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          ) : (
            <UploadCloud className="h-7 w-7 text-ink-faint" />
          )}
          <div className="text-sm font-medium text-ink">
            {state === 'loading'
              ? 'Extracting text…'
              : 'Choose a file or drag & drop it here'}
          </div>
          <div className="text-xs text-ink-muted">
            PDF or text · up to ~50,000 characters used as source material
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={state === 'loading'}
            className="mt-2 rounded-md border border-surface-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            Browse Files
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
