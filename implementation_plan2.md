# Async Document Processing Workflow System - V3 (Production Hardened)

This document outlines the detailed, step-by-step architecture build plan for the Async Document Processing Workflow System.

This "V3" plan incorporates enterprise-grade hardening: robust worker scaling, advanced OCR fallbacks (`pdfplumber` -> `pytesseract`), rigorous KIEval metric formulations using Hungarian matching, Monaco-based editing, SSE heartbeats, and exact human-correction-cost computation.

## Proposed Changes

We will build the system from scratch following the exact sequence mandated. Each step will be fully implemented before moving to the next.

### Step 1: Docker Compose + all service configs (Hardened)
- Create `docker-compose.yml` defining `postgres`, `redis`, `backend`, `worker` (multiple default workers `docker-compose scale worker=3`), `flower`, and `frontend`.
- Complete system dependencies for OCR in the backend Dockerfile: `RUN apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu poppler-utils`.
- Setup `.env.example` and `requirements.txt` (adding `pdfplumber`, `pytesseract`, `pydantic`, `scipy` for KIEval Hungarian matching, LLM clients).

### Step 2: PostgreSQL models + Alembic migration
- Create SQLAlchemy `database.py`.
- Define the core schema (`documents` and `processing_results`). `processing_results` stores extracted data, confidences, schema validation errors, and the four KIE metric tiers.
- Define the `correction_events` table tracking substitutions, additions, and deletions per field, calculating the diff between old JSON and new JSON on `PUT /result`.

### Step 3: Celery app setup + Redis connection + Postgres Backend
- Configure `celery_app.py` to connect to Redis.
- **[NEW]** Setup `CELERY_RESULT_BACKEND = 'db+postgresql://...'` to persist results beyond Redis (queryable via Flower/DB).
- Setup Redis Pub/Sub helpers with structured payloads returning partial metrics and granular states.

### Step 4: Advanced Core Celery task Pipeline
- Implement `process_document` task in `tasks.py` heavily hardened with `@task(time_limit=300, autoretry_for=(Exception,), retry_backoff=True)` and 9 exact stages:
  1. **job_started**: Update DB, publish event.
  2. **ocr_completed**: `pdfplumber` first, fallback to `pytesseract` on low-confidence pages. Calculate OCR quality (e.g. Levenshtein / heuristics). Route `< 0.8` to HITL early. Bonus: crop tables/images prior to OCR.
  3. **field_extracted**: Multi-modal LLM extraction combining Markdown + Image to yield JSON + per-field confidence.
  4. **schema_validated**: Strict Pydantic parsing. Failures append structured error lists and flag for HITL.
  5. **confidence_scored**: Auto-pass `≥0.90`, flag `0.70-0.89`, HITL queue `<0.70`.
  6. **consistency_checked**: Arithmetic and business logic bounds check. Store violation counts.
  7. **metrics_computed**: Generate mock ground truth smartly per doc-type. Compute raw Entity F1, apply Scipy `linear_sum_assignment` for KIEval Group F1. Compute `KIEval_Aligned`.
  8. **result_stored**: Update `processing_results` in DB.
  9. **job_completed**: Publish final event.

### Step 5: FastAPI routes (Part 1 - Core)
- Setup CORS and Pydantic schemas.
- Implement `/documents/upload` and GET `/documents`.
- Implement GET `/documents/{document_id}`.
- Implement GET `/documents/{document_id}/progress` with SSE streaming. **[NEW]** Incorporate heartbeat mechanism emitting `{"type": "heartbeat"}` every 30s.

### Step 6: FastAPI routes (Part 2 - Actions & Corrections)
- Implement POST `/{document_id}/retry`.
- Implement PUT `/{document_id}/result` incorporating exact correction cost logic (JSON diffing to compute `subs`, `adds`, `dels`) and dynamically updating `kieval_aligned = tp / (tp + subs + adds + dels)`.
- Implement POST `/{document_id}/finalize`.
- Implement GET `/{document_id}/export`. **[NEW]** Embed KIE tracking metrics natively into JSON/CSV downloads.

### Step 7: Next.js project scaffold + TypeScript types
- Initialize the App Router with rich aesthetics (modern dark mode, subtle glow).
- Setup models and types.

### Step 8: Upload page
- Drag-and-drop `UploadZone` connected to backend API.

### Step 9: Dashboard page
- Filterable `JobsTable` identifying HITL flags accurately based on stage 4/5/6 failures.

### Step 10: Document detail page with Advanced Editor
- Resilient SSE Hook parsing `"heartbeat"` messages to bypass 30s connection drops.
- **[NEW]** VSCode-like Monaco Editor (`@monaco-editor/react`) for raw/final JSON tweaking alongside schema validation rules.
- Confidence badges per field (`🟢 0.95`, `🟡 0.82`, `🔴 0.65`).
- Small Plotly (or similar React charting library) block serving a Metrics Dashboard comparing F1 tiers vs `KIEval_Aligned`.

### Step 11: Finalize Output
- Clean `README.md` and manual startup specs.

### Step 12: End-to-End Testing & Automated Validation
- Perform docker compose sanity checks.
- **[NEW]** Pytest implemented utilizing `mock_ocr_return` and mock pipelines testing task stages isolated behavior!


## Open Questions

> [!CAUTION]
> The project will be built in `d:\PROJECTS\Async Document Processing System`. Is this path correct?

> [!IMPORTANT]
> To clarify LLM extraction for the immediate build code context: I will configure the extractor pipeline with mock functions that return structure + deterministic dummy confidence scores/text. This isolates the systems' tracking capabilities (e.g., KIEval metrics logic, celery retries) during initial testing without relying on unprovided OpenAI API keys, ensuring you get a 100% runnable Docker architecture locally out of the box. Please let me know if you would prefer otherwise!

## Verification Plan

### Automated Tests
- Execute backend Pytest suites validating `test_process_document`.
- Mock human edits locally to ensure `KIEval_Aligned` behaves predictably.

### Manual Verification
- Execute `docker-compose up --build --scale worker=3`.
- Observe 3 concurrent workers in container logs and `Flower`.
- Observe real SSE pings keeping streams alive.
- Edit JSON using Monaco in the Next UI to watch metrics adapt dynamically.
