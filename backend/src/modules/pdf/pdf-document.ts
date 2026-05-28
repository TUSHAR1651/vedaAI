import { createElement as h } from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

/**
 * Server-side PDF generation with @react-pdf/renderer (NOT browser print).
 * Built with `React.createElement` so no JSX/tsx compilation is needed inside
 * the NestJS worker. `renderToBuffer` runs fully in Node — ideal for an async
 * BullMQ job.
 *
 * Layout mirrors the on-screen branded paper: school header, exam meta,
 * student fields, sections of questions, and an Answer Key.
 */

export interface PdfQuestion {
  question: string;
  marks: number;
  type: string;
  options?: string[];
  answer: string;
}
export interface PdfSection {
  title: string;
  instruction?: string;
  questions: PdfQuestion[];
}
export interface PdfPaper {
  schoolName: string;
  title: string;
  subject?: string;
  className?: string;
  timeAllowedMinutes?: number;
  totalMarks?: number;
  sections: PdfSection[];
}

const COLORS = {
  ink: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  brand: '#ea580c', // coral/orange accent
  faint: '#f1f5f9',
};

const styles = StyleSheet.create({
  page: { paddingHorizontal: 46, paddingVertical: 38, fontSize: 11, color: COLORS.ink, fontFamily: 'Helvetica' },

  school: { textAlign: 'center', borderWidth: 1.5, borderColor: COLORS.brand, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 10 },
  schoolName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.ink },
  schoolMeta: { fontSize: 10, color: COLORS.muted, marginTop: 3 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 10, color: COLORS.muted, marginBottom: 4 },
  rule: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 6 },

  studentRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  studentField: { flexDirection: 'row', alignItems: 'flex-end' },
  studentLabel: { fontSize: 10, color: COLORS.muted, marginRight: 4 },
  studentLine: { borderBottomWidth: 1, borderBottomColor: COLORS.ink, width: 90, height: 11 },

  generalNote: { fontSize: 9, fontStyle: 'italic', color: COLORS.muted, marginBottom: 10 },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.brand },
  sectionInstruction: { fontSize: 9.5, color: COLORS.muted, fontStyle: 'italic', marginBottom: 6 },

  question: { flexDirection: 'row', marginBottom: 8 },
  qNumber: { width: 20, fontFamily: 'Helvetica-Bold' },
  qBody: { flex: 1 },
  qText: { lineHeight: 1.4 },
  option: { marginLeft: 8, marginTop: 2, fontSize: 10 },
  marks: { fontSize: 9, color: COLORS.muted, marginLeft: 6 },
  qHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },

  answerHeader: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLORS.ink, marginTop: 8, marginBottom: 4 },
  answerItem: { flexDirection: 'row', marginBottom: 4 },
  answerNum: { width: 20, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  answerText: { flex: 1, fontSize: 10, color: COLORS.ink, lineHeight: 1.35 },

  footer: { position: 'absolute', bottom: 22, left: 46, right: 46, textAlign: 'center', fontSize: 8, color: COLORS.muted, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 5 },
  endNote: { textAlign: 'center', fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.muted, marginVertical: 8 },
});

function StudentInfo() {
  const field = (label: string, key: string) =>
    h(View, { style: styles.studentField, key }, [
      h(Text, { style: styles.studentLabel, key: 'l' }, `${label}:`),
      h(View, { style: styles.studentLine, key: 'line' }),
    ]);
  return h(View, { style: styles.studentRow }, [
    field('Name', 'name'),
    field('Roll No.', 'roll'),
    field('Section', 'section'),
  ]);
}

function QuestionRow(q: PdfQuestion, index: number) {
  const children: any[] = [
    h(View, { style: styles.qHeaderRow, key: 'hdr' }, [
      h(Text, { style: styles.qText, key: 'text' }, q.question),
      h(Text, { style: styles.marks, key: 'marks' }, `[${q.marks}]`),
    ]),
  ];
  if (q.options?.length) {
    children.push(
      ...q.options.map((opt, i) =>
        h(Text, { style: styles.option, key: `opt-${i}` }, `${String.fromCharCode(65 + i)}. ${opt}`),
      ),
    );
  }
  return h(View, { style: styles.question, key: `q-${index}`, wrap: false }, [
    h(Text, { style: styles.qNumber, key: 'num' }, `${index + 1}.`),
    h(View, { style: styles.qBody, key: 'body' }, children),
  ]);
}

function SectionBlock(section: PdfSection, sIndex: number, startNum: number) {
  return h(View, { style: styles.section, key: `s-${sIndex}` }, [
    h(Text, { style: styles.sectionTitle, key: 'title' }, section.title),
    section.instruction
      ? h(Text, { style: styles.sectionInstruction, key: 'instr' }, section.instruction)
      : null,
    ...section.questions.map((q, i) => QuestionRow(q, startNum + i)),
  ]);
}

function AnswerKey(paper: PdfPaper) {
  const items: any[] = [];
  let n = 0;
  paper.sections.forEach((s) => {
    s.questions.forEach((q) => {
      n += 1;
      items.push(
        h(View, { style: styles.answerItem, key: `a-${n}`, wrap: false }, [
          h(Text, { style: styles.answerNum, key: 'n' }, `${n}.`),
          h(Text, { style: styles.answerText, key: 't' }, q.answer),
        ]),
      );
    });
  });
  return h(View, { key: 'answerkey', break: true }, [
    h(Text, { style: styles.answerHeader, key: 'h' }, 'Answer Key'),
    h(View, { style: styles.rule, key: 'r' }),
    ...items,
  ]);
}

export function buildPdf(paper: PdfPaper): Promise<Buffer> {
  // Running question numbering across sections.
  let running = 0;
  const sectionBlocks = paper.sections.map((s, i) => {
    const block = SectionBlock(s, i, running);
    running += s.questions.length;
    return block;
  });

  const doc = h(Document, { title: paper.title, author: 'VedaAI' }, [
    h(Page, { size: 'A4', style: styles.page, key: 'page' }, [
      // School-branded header
      h(View, { style: styles.school, key: 'school' }, [
        h(Text, { style: styles.schoolName, key: 'n' }, paper.schoolName || 'School'),
        h(Text, { style: styles.schoolMeta, key: 's' }, `Subject: ${paper.subject || '-'}    Class: ${paper.className || '-'}`),
      ]),
      h(View, { style: styles.metaRow, key: 'meta' }, [
        h(Text, { key: 'time' }, `Time Allowed: ${paper.timeAllowedMinutes ?? '-'} minutes`),
        h(Text, { key: 'marks' }, `Maximum Marks: ${paper.totalMarks ?? '-'}`),
      ]),
      h(Text, { style: styles.generalNote, key: 'note' }, 'All questions are compulsory unless stated otherwise.'),
      StudentInfo(),
      h(View, { style: styles.rule, key: 'rule2' }),

      ...sectionBlocks,

      h(Text, { style: styles.endNote, key: 'end' }, '— End of Question Paper —'),
      AnswerKey(paper),

      h(
        Text,
        {
          style: styles.footer,
          key: 'footer',
          render: ({ pageNumber, totalPages }: any) =>
            `VedaAI Assessment  •  Page ${pageNumber} of ${totalPages}`,
          fixed: true,
        },
        '',
      ),
    ]),
  ]);

  return renderToBuffer(doc as any);
}
