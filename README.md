# VedaAI — AI Assessment Creator

A production-grade, full-stack platform that lets teachers generate **structured, validated, exam-ready question papers** with AI — with **async job processing**, **real-time progress over websockets**, **strict JSON output validation**, and **server-rendered PDF export**.

> **TL;DR** — Next.js dashboard → NestJS API → BullMQ worker → Zod-validated AI output → Mongo → Socket.io → school-branded paper + Answer Key + PDF.

---

## Table of Contents

1. [Highlights](#highlights)
2. [Architecture](#architecture)
3. [Monorepo layout](#monorepo-layout)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [The AI pipeline](#the-ai-pipeline)
7. [WebSocket protocol](#websocket-protocol)
8. [BullMQ queue flow](#bullmq-queue-flow)
9. [HTTP API reference](#http-api-reference)
10. [Tech stack](#tech-stack)
11. [Project shape (UI)](#project-shape-ui)
12. [Troubleshooting](#troubleshooting)

---

## Highlights

- **Async generation** — every AI call is enqueued; the HTTP request returns immediately, the worker does the heavy lifting in the background, and the UI watches progress over websockets.
- **Structured output, never markdown** — the AI is constrained by a Zod contract (`schemas/assessment.schema.ts`). Raw model text is parsed, validated and **retried** up to N times before anything is persisted.
- **School-branded paper + Answer Key** — every paper renders with school header (from a static profile), Subject, Class, Time Allowed, Max Marks, student fields, sections grouped by question type, and a full Answer Key.
- **Async PDF export** — frontend requests PDF → BullMQ job → worker uses `@react-pdf/renderer` in Node (no browser print) → URL emitted over websocket.
- **Per-question-type wizard** — multi-step Create flow where each row is `{ type, count, marks-per-question }` with live totals.
- **Real-time UI** — staged progress (Parsing → Generating sections → Generating questions → Validating → Finalizing) drives a progress bar + checklist; PDF readiness pushed over the same socket.
- **Regenerate paper / section** — full regenerate replaces the paper; section regenerate keeps the rest of the paper on screen and swaps just that section.
- **Keyless local dev** — `AI_PROVIDER=mock` returns deterministic, schema-valid output that exercises the entire pipeline end-to-end with no API key.
- **Strict env validation** — Zod refuses to boot the backend on a misconfigured env.

---

## Architecture

```
┌─────────────────────────┐        HTTP         ┌──────────────────────────┐
│  Next.js 14 (App Router)│ ──────────────────▶ │  NestJS REST API         │
│  Tailwind • Zustand     │ ◀───────────────── │  AssignmentController     │
│  RHF + Zod              │   structured JSON   │  PdfController            │
└──────────┬──────────────┘                     └────────────┬─────────────┘
           │                                                 │
           │  Socket.io                                      │ BullMQ.add()
           │  (join_assignment, progress,                    │
           │   completed, failed, pdf_*)                     ▼
           │                                       ┌──────────────────────┐
           │                                       │  Redis  (BullMQ +    │
           │                                       │  status/progress +   │
           │                                       │  prompt cache)       │
           │                                       └────────┬─────────────┘
           │                                                │
           │                                                ▼
           │                                    ┌────────────────────────┐
           │                                    │ BullMQ Worker (in-proc)│
           │                                    │  • Question generation │
           │                                    │  • PDF rendering       │
           │                                    └────┬──────────────┬────┘
           │                                         │              │
           │                                         ▼              ▼
           │                            ┌────────────────────┐  ┌──────────┐
           │                            │ AI Provider        │  │ MongoDB  │
           │                            │ (OpenAI / Gemini / │  │ Mongoose │
           │                            │ Mock — deterministic) │           │
           │                            └────────┬──────────┘  └──────────┘
           │                                     │ raw text
           │                                     ▼
           │                            ┌────────────────────┐
           │                            │ Zod validation     │
           │                            │  (retry on fail)   │
           │                            └────────┬──────────┘
           │                                     │ validated paper
           │                                     ▼
           │                            ┌────────────────────┐
           └─────────── ws events ──────│  RealtimeService   │
                                        └────────────────────┘
```

### Data flow (happy path)

1. Teacher submits the wizard → `POST /api/assignments`.
2. `AssignmentService` saves the Assignment (`status: pending`, computed `totalQuestions`/`totalMarks`) and enqueues a `question-generation` job. HTTP response returns immediately.
3. Worker picks up the job → flips status to `processing` → emits `generation_started`, then staged `generation_progress` events.
4. `AiService.generatePaper()` builds the (system, user, schema) prompt, calls the configured provider, **parses + Zod-validates** the response. On validation failure it retries up to `AI_MAX_VALIDATION_RETRIES`.
5. Server-side attaches header fields (school name from profile, subject / class / time / total marks from the assignment) and persists the `GeneratedPaper`.
6. `realtime.completed(...)` broadcasts the validated paper to the room `assignment:<id>`.
7. Frontend `useGeneration(assignmentId)` updates Zustand → React rerenders the school-branded paper + Answer Key.
8. PDF: user clicks **Download as PDF** → `POST /api/assignments/:id/pdf` enqueues `pdf-generation` → worker renders with `@react-pdf/renderer` to disk → `pdf_completed` event sent with the URL → button swaps to a direct download link.

---

## Monorepo layout

```
VedaAI/
├── backend/                         # NestJS API + workers
│   ├── src/
│   │   ├── config/                  # Zod-validated env + typed config
│   │   ├── common/                  # Constants, profile, redis service
│   │   ├── schemas/                 # Zod contracts (assessment + create DTO)
│   │   ├── prompts/                 # System / user / schema prompts
│   │   ├── modules/
│   │   │   ├── assignment/          # CRUD + entities (Assignment, GeneratedPaper)
│   │   │   ├── generation/          # GenerationService + AI providers (openai/gemini/mock)
│   │   │   └── pdf/                 # Async PDF export + react-pdf document
│   │   ├── queues/                  # BullMQ producer + queue constants
│   │   ├── workers/                 # question-generation + pdf-generation processors
│   │   ├── websocket/               # Socket.io gateway + RealtimeService
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                        # Next.js 14 (App Router)
│   ├── app/
│   │   ├── layout.tsx               # Wraps every page in the DashboardShell
│   │   ├── page.tsx                 # Assignments list (empty + filled)
│   │   ├── create/page.tsx          # Multi-step Create wizard
│   │   └── papers/[assignmentId]/page.tsx   # Output: progress / paper / PDF
│   ├── components/
│   │   ├── layout/                  # Sidebar, Topbar, MobileNav, DashboardShell, Logo
│   │   ├── AssignmentCard.tsx       # Card on the dashboard (with View / Delete menu)
│   │   ├── CreateWizard.tsx         # RHF + Zod, 2-step
│   │   ├── QuestionTypeTable.tsx    # Per-type rows with live totals
│   │   ├── FileUpload.tsx           # Drag & drop, server-side text extraction
│   │   ├── PaperView.tsx            # School-branded paper renderer
│   │   ├── AnswerKey.tsx
│   │   ├── ActionBar.tsx            # Regenerate + Download as PDF
│   │   └── GenerationProgress.tsx
│   ├── store/                       # Zustand
│   ├── hooks/useGeneration.ts       # Socket.io subscription + REST snapshot bootstrap
│   ├── services/                    # API client (no UI logic in components)
│   ├── lib/                         # api, socket, validation (Zod), profile
│   └── types/                       # Single source of truth, mirrored from backend
│
├── docker-compose.yml               # mongo + redis (+ optional backend)
├── .env.example
└── README.md
```

---

## Quick start

> Requires **Node 20+**, **Docker**, and ports `4000` (backend) + `3000` (frontend) free. Mongo/Redis run in containers.

```bash
# 1) Infra (Mongo + Redis)
docker compose up -d mongo redis

# 2) Backend
cd backend
cp ../.env.example .env          # then edit if you want OpenAI/Gemini
npm install
npm run start:dev                # http://localhost:4000  (REST + ws)

# 3) Frontend (separate terminal)
cd frontend
npm install
npm run dev                       # http://localhost:3000
```

Open **http://localhost:3000** → click **Create Assignment** → fill the wizard → watch the live progress → see the school-branded paper with Answer Key → **Download as PDF**.

### Port conflicts

If `27017` / `6379` / `3000` are already used on your machine, override the host-side ports:

```bash
# in the root .env (consumed by docker-compose)
MONGO_PORT_HOST=27018
REDIS_PORT_HOST=6380
```

And if you remap Redis, set `REDIS_PORT=6380` in `backend/.env` (only matters when running the backend outside Docker). Next.js will auto-fall-back to the next free port if 3000 is taken; the backend CORS allowlist already includes both 3000 and 3001.

### Full Docker

```bash
docker compose up --build       # mongo + redis + backend
cd frontend && npm run dev       # frontend stays local for fastest DX
```

---

## Environment variables

See [`.env.example`](./.env.example). Key ones:

| Variable | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `mock` | `openai` \| `gemini` \| `mock` — `mock` requires no API key |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | — / `gpt-4o-mini` | When `AI_PROVIDER=openai` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | — / `gemini-1.5-flash` | When `AI_PROVIDER=gemini` |
| `AI_MAX_VALIDATION_RETRIES` | `2` | How many times the worker re-calls the model when Zod validation fails |
| `MONGO_URI` | `mongodb://localhost:27017/vedaai` | |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | |
| `STORAGE_DIR` | `./storage` | Where generated PDFs are written |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins (also gates Socket.io) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Frontend → backend base URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4000` | Frontend → websocket base URL |

The backend uses Zod (`backend/src/config/env.validation.ts`) to validate the env on boot — misconfigured envs fail fast with a readable error.

---

## The AI pipeline

### Prompt structure

Three layers, exactly as the spec requires:

1. **System prompt** — role, hard JSON-only rules, allowed question types, required fields.
2. **User prompt** — title, subject, class, time, per-type requirements ("Section A: 5 × Multiple Choice, 1 mark each"), additional instructions, source material.
3. **Schema contract** — explicit JSON shape (`{ title, sections: [{ title, instruction, questions: [{ question, marks, type, options?, answer }] }] }`) appended to the user prompt.

See [`backend/src/prompts/assessment.prompt.ts`](./backend/src/prompts/assessment.prompt.ts).

### Validation + retry

The model returns raw text. The pipeline:

```
raw text  →  strip ```json fences, isolate outermost { }  →  JSON.parse
         →  generatedPaperSchema.safeParse (Zod)
         →  success ? return : retry (up to AI_MAX_VALIDATION_RETRIES)
         →  still failing after retries ? throw ValidationFailedError
            → worker emits generation_failed → frontend shows error UI
```

The Zod contract enforces: required answers on every question (so the Answer Key is always renderable), positive marks, non-empty section titles, non-empty question text, and that types are in the allowed enum.

### Header fields are server-side

Trust the model only for content, not metadata. School name comes from the static `PROFILE`; subject / class / time allowed / total marks come from the assignment. Total marks are recomputed from the questions — we never trust the model's arithmetic.

### Switching providers

```bash
AI_PROVIDER=openai      # uses chat.completions with response_format=json_object
AI_PROVIDER=gemini      # uses generative-language with responseMimeType=application/json
AI_PROVIDER=mock        # zero-config, deterministic, perfect for tests/demos
```

The mock provider reads a structured `meta` payload (not the prompt string) so it always honours the requested per-type counts and marks — no fragile prompt parsing.

---

## WebSocket protocol

Single namespace, room-per-assignment.

### Client → Server

| Event | Payload |
|---|---|
| `join_assignment` | `{ assignmentId }` — joins the room `assignment:<id>` |
| `leave_assignment` | `{ assignmentId }` |

### Server → Client

| Event | Payload | Emitted when |
|---|---|---|
| `generation_started` | `{ assignmentId, at }` | Worker picks the job up |
| `generation_progress` | `{ assignmentId, stage, label, progress }` | Staged updates (10/40/70/85/95) |
| `generation_completed` | `{ assignmentId, paperId, paper }` | Full or section regenerate |
| `generation_failed` | `{ assignmentId, message, errors? }` | Validation/retry budget exhausted |
| `pdf_started` | `{ assignmentId, paperId }` | PDF job picked up |
| `pdf_completed` | `{ assignmentId, paperId, url, fileName }` | PDF written to disk |
| `pdf_failed` | `{ assignmentId, paperId, message }` | PDF job failed |

The frontend hook `useGeneration(assignmentId)` subscribes to all of these and also bootstraps from `GET /api/assignments/:id/status` so a refresh / late join recovers the current state.

---

## BullMQ queue flow

Two queues, both backed by Redis.

| Queue | Producer | Processor | Retry |
|---|---|---|---|
| `question-generation` | `POST /assignments`, `POST /assignments/:id/regenerate`, `POST /assignments/:id/sections/:i/regenerate` | `QuestionGenerationProcessor` | `attempts: 3`, exponential backoff |
| `pdf-generation` | `POST /assignments/:id/pdf` | `PdfGenerationProcessor` | `attempts: 3`, exponential backoff |

The processors run in-process (via `@nestjs/bullmq`) and have full DI access to Mongoose models, the AI service, and the RealtimeService — so workers can persist results and broadcast events in the same transaction-shaped flow.

Idempotency: full-paper regenerate **upserts** the `GeneratedPaper` for the assignment (no piling-up); section regenerate mutates a single section index in place.

---

## HTTP API reference

All endpoints are under `/api`.

| Method | Path | Body / Notes |
|---|---|---|
| `GET` | `/health` | Liveness + provider info |
| `GET` | `/api/assignments` | List (newest first, 50 max) |
| `POST` | `/api/assignments` | Create + enqueue generation. Body validated by `createAssignmentSchema` |
| `GET` | `/api/assignments/:id` | Single assignment |
| `DELETE` | `/api/assignments/:id` | Delete assignment + its paper |
| `GET` | `/api/assignments/:id/status` | `{ status, progress, errorMessage }` snapshot |
| `GET` | `/api/assignments/:id/paper` | The validated `GeneratedPaper` |
| `POST` | `/api/assignments/:id/regenerate` | Re-enqueue full generation |
| `POST` | `/api/assignments/:id/sections/:index/regenerate` | Regenerate one section |
| `POST` | `/api/assignments/:id/pdf` | Enqueue async PDF render |
| `GET` | `/api/pdf/file/:fileName` | Serve a rendered PDF |
| `POST` | `/api/pdf/extract-text` | `multipart/form-data` (`file=`) → extracted text |

### Sample create body

```json
{
  "title": "Operating Systems Quiz",
  "subject": "Computer Science",
  "className": "8",
  "dueDate": "2026-06-15",
  "timeAllowedMinutes": 45,
  "instructions": "Cover deadlock and scheduling.",
  "questionSpec": [
    { "type": "multiple_choice", "count": 5, "marks": 1 },
    { "type": "short_answer",   "count": 3, "marks": 2 },
    { "type": "numerical",      "count": 2, "marks": 5 }
  ]
}
```

### Sample paper response (trimmed)

```json
{
  "_id": "…", "assignmentId": "…",
  "schoolName": "Delhi Public School, Sector-4",
  "title": "Operating Systems Quiz",
  "subject": "Computer Science", "className": "8",
  "timeAllowedMinutes": 45, "totalMarks": 21,
  "sections": [
    {
      "title": "Section A",
      "instruction": "Multiple Choice Questions. Each question carries 1 mark. Attempt all questions.",
      "questions": [
        { "question": "…", "marks": 1, "type": "multiple_choice",
          "options": ["…", "…", "…", "…"], "answer": "Option A" }
      ]
    }
  ],
  "pdfUrl": null, "pdfFileName": null,
  "generatedAt": "…"
}
```

---

## Tech stack

**Frontend**

- Next.js 14 (App Router) · TypeScript · TailwindCSS
- Zustand · React Hook Form · Zod
- Socket.io client · Lucide icons

**Backend**

- NestJS · TypeScript
- MongoDB / Mongoose · Redis / ioredis · BullMQ
- Socket.io (`@nestjs/platform-socket.io`)
- Zod (request validation + AI output contract)
- `@react-pdf/renderer` (server-side PDF, via `React.createElement` so no JSX/tsx compile needed)
- `pdf-parse` for reference uploads
- OpenAI SDK · `@google/generative-ai` · Mock provider

---

## Project shape (UI)

Three routes, all rendered inside a persistent dashboard shell (left sidebar + top bar on desktop; bottom tab bar on mobile):

- `/` — **Assignments dashboard** (empty state + filled grid of cards, search, per-card menu with View / Delete).
- `/create` — **Create wizard** (2 steps: Assignment Details → Review & Generate). Per-question-type rows with live `Total Questions` / `Total Marks`.
- `/papers/[assignmentId]` — **Output page** (live progress while generating; on completion: AI intro line, school-branded paper with student fields, sections, Answer Key, and **Download as PDF**).

The sidebar shows the static profile (school + teacher); `Home`, `My Groups`, `AI Teacher's Toolkit`, `My Library`, `Settings` render as styled placeholders (scope outside the assignments flow).

---

## Troubleshooting

- **`EADDRINUSE: 6379`** — another Redis is already on 6379. Set `REDIS_PORT_HOST=6380` in the root `.env` and `REDIS_PORT=6380` in `backend/.env`.
- **Frontend lands on `:3001` instead of `:3000`** — port 3000 is taken; Next auto-fell-back. CORS allows both, so this works as-is.
- **`MONGO_URI is required`** — the env validation refused to boot. Copy `.env.example` to `backend/.env`.
- **Validation failures on real models** — bump `AI_MAX_VALIDATION_RETRIES` or check the worker logs; the validation issues are surfaced in the `generation_failed` event.
- **PDF blank / broken** — make sure `STORAGE_DIR` exists and is writable (the Docker image creates `/app/storage`).
