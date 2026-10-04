# UX Scenario Agent — Detailed Architecture

## 1. Goal

Turn a PRD into a traceable, coherent UX analysis report using the Codex agent runtime. The application is not a generic LLM wrapper. Codex threads are the execution units.

## 2. Perspective model

A run may contain any non-empty subset of:

1. Concept
2. User Scenario
3. Structures
4. Interaction & Policy
5. UX Design Scope
6. Open Decisions & Dependencies

The user selects this subset on the home page before Generate Analysis.

## 3. Runtime model

Each selected perspective receives its own Codex `Thread`. Threads execute concurrently up to `MAX_PARALLEL_AGENTS`.

The Node orchestrator owns:

- lifecycle
- concurrency
- PRD context
- Codex configuration
- event forwarding
- validation
- composition
- critic/refinement
- persistence
- cancellation

The browser never owns a Codex credential and never invokes Codex directly.

## 4. Artifact contract

Perspective agents return HTML sections:

```html
<section id="concept" class="ux-section">...</section>
```

The section is the stable UX artifact. JSON is not used as the canonical UX representation.

Application metadata may use JSON for APIs and persistence.

## 5. Shared context

All perspective agents receive:

- original PRD
- shared UX instructions
- certainty model
- evidence rules
- HTML safety rules
- shared visual language
- their specialist instructions

Certainty:

- Explicit — directly stated by PRD
- Inferred — logically derived
- Unknown — insufficient information

## 6. Quality pipeline

```text
Perspective Codex Threads
        ↓
HTML Validator
        ↓
Codex Report Composer
        ↓
Codex UX Critic
        ↓
   needs refinement?
     /          \
   yes           no
    ↓             ↓
Codex Refiner   Final HTML
    ↓
Final HTML
```

The critic checks against the original PRD and the composed report. It looks for unsupported claims, contradictions, missing major requirements, weak traceability and structural problems.

## 7. Streaming

Codex `runStreamed()` events are converted to application progress events and sent to the Vue client through SSE.

Example:

```text
analysis.started
agent.started
agent.event
validation.completed
agent.completed
composer.started
critic.completed
composer.completed
analysis.completed
```

## 8. Cancellation

The orchestrator keeps an `AbortController` per analysis. The controller's signal is passed to Codex turns. The cancel API calls `abort()`.

## 9. Re-running

A perspective can be rerun independently. The old HTML remains stored until the new turn succeeds. After success, the selected sections are recomposed.

## 10. Persistence

Development fallback:

```text
backend/data/analyses.json
```

Production:

```text
PostgreSQL
  ux_analyses
```

The persistence interface is intentionally isolated so Redis/object storage/job queues can be introduced without changing the agent code.

## 11. Security posture

Perspective agents use `read-only` Codex sandbox by default because the task is analysis. The report validator rejects scripts, iframes, inline event handlers, JavaScript URLs and unsafe embed/external elements.

For an externally accessible product, use a dedicated HTML sanitizer as an additional defense layer.

## 12. Scaling architecture

The current project is a single Node process. A production deployment can evolve to:

```text
Load Balancer
      ↓
API instances
      ↓
Redis / Job Queue
      ↓
Codex Worker Pool
      ↓
PostgreSQL + Object Storage
```

Workers can process perspective jobs independently. SSE can be backed by Redis pub/sub or a managed event channel.

## 13. Why this architecture

### Codex instead of direct LLM calls

Codex supplies the agent runtime and its execution environment. The application controls the workflow around Codex rather than reimplementing the agent runtime as a prompt-only API call.

### HTML instead of JSON UX models

The user's downstream artifact is HTML and the existing Figma workflow consumes HTML. Returning HTML from the perspective agents avoids an unnecessary intermediate representation.

### Central composer

Parallel specialists can disagree. A central Codex Composer is responsible for making the final report coherent while preserving each perspective.

### Critic after composition

Quality problems are often cross-perspective, so criticism happens after composition rather than only within each specialist.
