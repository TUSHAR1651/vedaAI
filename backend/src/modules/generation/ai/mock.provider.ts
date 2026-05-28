import { Logger } from '@nestjs/common';
import { AiProvider, CompletionRequest } from './ai-provider.interface';
import { QUESTION_TYPE_LABELS, QuestionType } from '../../../schemas/assessment.schema';
import { PromptInput, PromptSpecRow } from '../../../prompts/assessment.prompt';

/**
 * Keyless provider that returns deterministic, schema-valid JSON. Lets the
 * entire async pipeline (queue → worker → validation → ws → persistence → PDF)
 * be exercised end-to-end with no API key or network call. Selected via
 * AI_PROVIDER=mock (the default).
 *
 * It reads the structured `meta` payload (not the prompt string) so it always
 * honours the requested per-type counts, marks and section layout.
 */
export class MockProvider implements AiProvider {
  readonly name = 'mock';
  private readonly logger = new Logger('MockProvider');

  async complete(req: CompletionRequest): Promise<string> {
    // Simulate model latency so the progress bar is actually observable.
    await new Promise((r) => setTimeout(r, 600));

    if (req.meta?.section) {
      return this.buildSection(
        req.meta.input,
        req.meta.section as { title: string; type: QuestionType; count: number; marks: number },
      );
    }
    if (req.meta?.input) {
      return this.buildPaper(req.meta.input);
    }
    // Defensive fallback (should not happen — meta is always supplied).
    return JSON.stringify({
      title: 'Generated Assessment',
      sections: [
        {
          title: 'Section A',
          instruction: 'Attempt all questions.',
          questions: [
            { question: 'Sample question.', marks: 1, type: 'short_answer', answer: 'Sample answer.' },
          ],
        },
      ],
    });
  }

  private buildQuestion(subject: string, label: string, index: number, type: QuestionType, marks: number) {
    const q: Record<string, unknown> = {
      question: `(${subject}) ${label} #${index + 1}: explain or solve this item.`,
      marks,
      type,
      answer: `Model answer for ${label.toLowerCase()} #${index + 1}.`,
    };
    if (type === 'multiple_choice') {
      q.options = ['Option A', 'Option B', 'Option C', 'Option D'];
      q.answer = 'Option A';
    } else if (type === 'true_false') {
      q.options = ['True', 'False'];
      q.answer = 'True';
    }
    return q;
  }

  private buildSectionObject(subject: string, letter: string, row: PromptSpecRow) {
    const label = QUESTION_TYPE_LABELS[row.type];
    const questions = Array.from({ length: row.count }, (_, i) =>
      this.buildQuestion(subject, label, i, row.type, row.marks),
    );
    return {
      title: `Section ${letter}`,
      instruction: `${label}. Each question carries ${row.marks} mark${row.marks === 1 ? '' : 's'}. Attempt all questions.`,
      questions,
    };
  }

  private buildPaper(input: PromptInput): string {
    const sections = input.questionSpec.map((row, i) =>
      this.buildSectionObject(input.subject, String.fromCharCode(65 + i), row),
    );
    return JSON.stringify({ title: input.title, sections });
  }

  private buildSection(
    input: PromptInput,
    section: { title: string; type: QuestionType; count: number; marks: number },
  ): string {
    const obj = this.buildSectionObject(input.subject, '', {
      type: section.type,
      count: section.count,
      marks: section.marks,
    });
    return JSON.stringify({ ...obj, title: section.title });
  }
}
