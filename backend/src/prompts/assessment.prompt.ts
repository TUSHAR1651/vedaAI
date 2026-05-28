import { QUESTION_TYPES, QUESTION_TYPE_LABELS, QuestionType } from '../schemas/assessment.schema';

/**
 * ============================================================
 *  PROMPT ENGINEERING
 * ------------------------------------------------------------
 *  Three layers per the spec:
 *    1. system prompt   — role + hard output rules
 *    2. user prompt      — the concrete per-type request
 *    3. schema contract  — an explicit JSON shape the model must satisfy
 *
 *  The model produces a title + sections (one section per requested question
 *  type) where every question carries an answer (for the answer key). The
 *  school / class / subject / time header is applied server-side.
 * ============================================================
 */

export interface PromptSpecRow {
  type: QuestionType;
  count: number;
  marks: number; // marks per question
}

export interface PromptInput {
  title: string;
  subject: string;
  className: string;
  timeAllowedMinutes: number;
  instructions?: string;
  questionSpec: PromptSpecRow[];
  sourceMaterial?: string;
}

export const SYSTEM_PROMPT = `You are an educational assessment generation engine used by teachers to create exam question papers.

Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations or any text outside the JSON object.

Questions must be grouped into sections — create ONE section per requested question type, in the order given, titled "Section A", "Section B", "Section C", and so on.

Each question object must contain exactly these fields:
- "question": string (the question text)
- "marks": number (positive)
- "type": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "answer": string (the correct/model answer — REQUIRED for the answer key)

For "multiple_choice" and "true_false" questions, also include an "options" array of strings.

Questions must be academically sound, unambiguous, age-appropriate for the class, and aligned to the subject.`;

export const RESPONSE_SCHEMA_CONTRACT = `Respond with a JSON object that strictly matches this schema:

{
  "title": string,
  "sections": [
    {
      "title": string,
      "instruction": string,
      "questions": [
        {
          "question": string,
          "marks": number,
          "type": "multiple_choice" | "short_answer" | "long_answer" | "diagram" | "numerical" | "true_false" | "fill_in_the_blank",
          "options": string[] (only for multiple_choice/true_false),
          "answer": string
        }
      ]
    }
  ]
}`;

export function buildUserPrompt(input: PromptInput): string {
  const lines: string[] = [
    `Create an assessment question paper with the following requirements:`,
    ``,
    `Title: ${input.title}`,
    `Subject: ${input.subject}`,
    `Class / Grade: ${input.className}`,
    `Time allowed: ${input.timeAllowedMinutes} minutes`,
    ``,
    `Produce exactly these sections (one per question type, in this order):`,
  ];

  input.questionSpec.forEach((row, i) => {
    const sectionLetter = String.fromCharCode(65 + i);
    lines.push(
      `  - Section ${sectionLetter}: ${row.count} × ${QUESTION_TYPE_LABELS[row.type]} ` +
        `(type "${row.type}"), each worth ${row.marks} mark(s). ` +
        `Set the section instruction to describe the type and per-question marks.`,
    );
  });

  if (input.instructions?.trim()) {
    lines.push(``, `Additional instructions from the teacher:`, input.instructions.trim());
  }

  if (input.sourceMaterial?.trim()) {
    lines.push(
      ``,
      `Base the questions on the following reference material (truncated):`,
      `"""`,
      input.sourceMaterial.trim().slice(0, 8000),
      `"""`,
    );
  }

  lines.push(
    ``,
    `Every question must include an "answer". Only use the question types listed.`,
    ``,
    RESPONSE_SCHEMA_CONTRACT,
  );

  return lines.join('\n');
}

/** Prompt for regenerating a single section while keeping the rest intact. */
export function buildSectionPrompt(
  input: PromptInput,
  section: { title: string; type: QuestionType; count: number; marks: number },
): { system: string; user: string } {
  const user = [
    `Regenerate a single section of an existing assessment.`,
    ``,
    `Subject: ${input.subject}`,
    `Class / Grade: ${input.className}`,
    `Section title: ${section.title}`,
    `Question type: ${QUESTION_TYPE_LABELS[section.type]} (type "${section.type}")`,
    `Number of questions: ${section.count}, each worth ${section.marks} mark(s).`,
    input.instructions?.trim() ? `\nTeacher instructions: ${input.instructions.trim()}` : '',
    input.sourceMaterial?.trim()
      ? `\nReference material:\n"""\n${input.sourceMaterial.trim().slice(0, 6000)}\n"""`
      : '',
    ``,
    `Respond with ONLY a single JSON object for this one section matching:`,
    `{`,
    `  "title": string,`,
    `  "instruction": string,`,
    `  "questions": [ { "question": string, "marks": number, "type": "${section.type}", "options": string[], "answer": string } ]`,
    `}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { system: SYSTEM_PROMPT, user };
}
