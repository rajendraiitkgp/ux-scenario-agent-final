# UX Scenario Agent — Production-oriented Codex SDK Edition

A Vue 3 + TypeScript + Node.js application that uses the **Codex SDK as the agent runtime**, not a direct LLM completion wrapper.

## What this version includes

- PRD input: `.md`, `.txt`, or paste
- **Perspective selection on the home page before Generate Analysis**
- Run one, multiple, or all six UX perspectives
- Six specialized Codex agent threads running in parallel
- Streamed Codex progress through Server-Sent Events
- HTML fragments as the agent artifact; no JSON-to-HTML UX model
- Per-section HTML validation/security checks
- Codex Report Composer
- Codex UX Report Critic
- Optional Codex refinement pass
- Final scrollable HTML report
- Re-run a single perspective without rerunning the others
- Cancel running analyses using AbortSignal
- Analysis history
- PostgreSQL persistence for production, JSON fallback for local development
- Docker Compose PostgreSQL
- HTML download and HTML→Figma-ready output
- External prompt files for every perspective
- Configurable concurrency, reasoning effort and sandbox

## Architecture

```text
Vue 3
  │ HTTP + SSE
  ▼
Node/TypeScript Orchestrator
  │
  ├── Codex Concept Thread
  ├── Codex User Scenario Thread
  ├── Codex Structures Thread
  ├── Codex Interaction & Policy Thread
  ├── Codex UX Design Scope Thread
  └── Codex Open Decisions Thread
          │
          ▼
   HTML Section Validation
          │
          ▼
   Codex Report Composer
          │
          ▼
      Codex UX Critic
          │
       needs fix?
        /      \
      yes       no
       │         │
       ▼         │
  Codex Refiner  │
       └────┬────┘
            ▼
       Final HTML
            │
            ├── Browser
            └── HTML → Figma
```

## Requirements

- Node.js 18+
- Codex CLI/runtime supplied by `@openai/codex-sdk`
- Codex authentication (`codex login`) or `CODEX_API_KEY`
- Optional PostgreSQL 16+

The TypeScript Codex SDK officially requires Node.js 18+, wraps the Codex CLI, supports `startThread()`, `runStreamed()`, persisted/resumable threads, sandbox controls and streamed events. See the official SDK README: https://github.com/openai/codex/tree/main/sdk/typescript

## Install

```bash
npm install
npm run install:all
```

## Authenticate Codex

Recommended local development:

```bash
codex login
```

Or set `CODEX_API_KEY` in `.env`.

## Local development without PostgreSQL

Copy `.env.example` to `.env` and run:

```bash
npm run dev
```

The app uses `backend/data/analyses.json` when `DATABASE_URL` is not set.

Frontend: http://localhost:5173
Backend: http://localhost:8787

## PostgreSQL production mode

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Set:

```env
DATABASE_URL=postgresql://uxagent:uxagent@localhost:5432/ux_scenario_agent
```

Then:

```bash
npm run dev
```

The application creates its table automatically on startup.

## Important Codex configuration

```env
CODEX_MODEL=
CODEX_REASONING_EFFORT=high
CODEX_SANDBOX=read-only
MAX_PARALLEL_AGENTS=6
MAX_CRITIC_REFINEMENTS=2
```

For this UX analysis product, `read-only` is intentional: the agents analyze PRDs and generate HTML artifacts; they do not need permission to modify the source repository.

## Agent prompts

Modify these files to tune the product:

- `backend/prompts/shared.md`
- `backend/prompts/agents/concept.md`
- `backend/prompts/agents/user-scenario.md`
- `backend/prompts/agents/structures.md`
- `backend/prompts/agents/interaction-policy.md`
- `backend/prompts/agents/ux-design-scope.md`
- `backend/prompts/agents/open-decisions.md`

## API

- `POST /api/analyses` — start an analysis
- `GET /api/analyses` — history
- `GET /api/analyses/:id` — analysis details
- `GET /api/analyses/:id/events` — SSE progress stream
- `POST /api/analyses/:id/cancel` — cancel running analysis
- `POST /api/analyses/:id/rerun/:perspective` — regenerate one perspective
- `GET /api/analyses/:id/report` — final HTML

## Product flow

### Home

1. Choose `.md`/`.txt` PRD or paste PRD.
2. Select one, multiple, or all six perspectives.
3. Click **Generate Analysis**.

There is deliberately no perspective selection after generation: the selected perspectives are fixed for that analysis run.

### Execution

Selected Codex agents execute in parallel. Each agent returns one self-contained HTML section.

### Quality pipeline

The orchestrator validates every section. Once the selected perspectives are available, the Codex Report Composer assembles the report. A Codex UX Critic checks the composed report against the original PRD. If the critic finds actionable issues, the Codex Refiner performs a refinement pass.

### Re-run

From the report, click the refresh icon next to a perspective. Only that Codex perspective is regenerated, then the report is recomposed.

## Why this is Codex SDK integration

The backend creates `Codex` and `Thread` instances from `@openai/codex-sdk`. It uses `thread.runStreamed()` and consumes the SDK's structured event stream. The application stores the resulting Codex thread IDs so the architecture can later resume or inspect individual threads. This is not a direct `responses.create()` LLM wrapper.

## Production hardening still recommended before external users

- Authentication/authorization
- Rate limiting and per-user quotas
- Redis-backed job queue for multi-instance deployment
- Object storage for large PRDs/reports
- Encrypt sensitive PRD data at rest
- Audit log
- Observability/tracing and token/cost accounting
- Background worker deployment instead of executing all jobs inside the API process
- Stronger HTML sanitization with a dedicated sanitizer before rendering untrusted HTML
- Automated integration tests using a mocked Codex executable
