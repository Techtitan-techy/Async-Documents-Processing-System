# Async Document Processing Workflow System - V2 (Advanced Architecture)

This document outlines the detailed plan to build the Async Document Processing Workflow System using Next.js, FastAPI, PostgreSQL, and Celery. 

This plan has been **upgraded** based on the latest research synthesis, replacing the simplistic single-pass mock pipeline with a robust, agentic multimodal architecture featuring schema validation, business logic checking, confidence-based routing, and real-time KIEval metrics computation.

## Proposed Changes

We will build the system from scratch following the exact sequence mandated. Each step will be fully implemented before moving to the next.

### Step 1: Docker Compose + all service configs
- Create `docker-compose.yml` defining `postgres`, `redis`, `backend`, `worker`, `flower`, and `frontend` services.
- Note: The `worker` will require system dependencies for `pytesseract` (e.g., `tesseract-ocr`) and poppler for PDF processing.
- Create `.env.example` adding keys for LLM providers if necessary (or configuring mock multimodal LLMs).
- Setup `requirements.txt` for the backend, adding `pytesseract`, `pdfplumber`, `pydantic` (for schema validation), and an LLM client.

### Step 2: PostgreSQL models + Alembic migration
- Create SQLAlchemy `database.py`.
- Define **three** tables in `models/document.py`:
  1. `documents`: Stores file metadata and overall status.
  2. `processing_results`: Stores extracted fields (`title`, `category`, `summary`, `keywords`), per-field confidence scores, full `raw_result` JSON, validation errors, and **KIE metrics** (`entity_f1`, `kieval_entity_f1`, `group_f1`, `kieval_aligned`).
  3. `correction_events`: **[NEW]** Logs human edits locally mapping to fields (type of edit: `substitution`, `addition`, `deletion`) to compute the actual correction cost and `KIEval_Aligned`.
- Setup Alembic and generate the initial migration.

### Step 3: Celery app setup + Redis connection
- Configure `celery_app.py` to connect to Redis.
- Setup Redis Pub/Sub helpers in `utils/redis_pubsub.py`.

### Step 4: Advanced Core Celery task Pipeline
- Implement `process_document` task in `tasks.py` with the 9 upgraded stages:
  1. **job_started**: Update DB status to 'processing', publish event.
  2. **ocr_completed**: Use `pytesseract` / `pdfplumber` to generate structured Markdown text.
  3. **field_extracted**: Multi-modal LLM extraction combining Markdown + Image to yield structured JSON alongside per-field confidence scores.
  4. **schema_validated**: Run data against a rigorous Pydantic schema. Failures route directly to Human in the Loop (HITL) with structured error lists.
  5. **confidence_scored**: Apply confidence routing (≥0.90 auto-pass, 0.70–0.89 flag, <0.70 route to HITL queue).
  6. **consistency_checked**: Run math/business rules (e.g. arithmetic checks). Store violation counts.
  7. **metrics_computed**: Calculate Baseline Entity F1, KIEval Entity F1, Group F1, and KIEval_Aligned.
  8. **result_stored**: Insert/upsert into `processing_results`.
  9. **job_completed**: Update DB status to 'completed', publish final SSE event.
- Implement robust exception handling routing to `job_failed` on hard crashes.

### Step 5: FastAPI routes (Part 1 - Core)
- Configure `main.py` with CORS. Setup `config.py`.
- Implement schemas in `schemas/document.py`.
- Implement POST `/documents/upload` and GET `/documents` routes.
- Implement GET `/documents/{document_id}` and GET `/documents/{document_id}/progress` (SSE) routes.

### Step 6: FastAPI routes (Part 2 - Actions & Corrections)
- Implement POST `/documents/{document_id}/retry`.
- Implement PUT `/documents/{document_id}/result`. **[UPDATED]** - Triggers storing `correction_events` (substitution/addition/deletion) mapping the diff from raw_result to final_result, and re-triggers KIEval_Aligned metric computations.
- Implement POST `/documents/{document_id}/finalize`.
- Implement GET `/documents/{document_id}/export`.
- Add backend logic to `services/document_service.py`.

### Step 7: Next.js project scaffold + TypeScript types
- Initialize the Next.js App Router project using required configurations.
- Create shared types in `types/index.ts`, adding types for confidence scores, metrics, and validation errors.
- Implement Axios API client in `lib/api.ts`.
- Setup rich aesthetic global CSS and Next.js default Tailwind configuration focusing on a sleek dark mode.

### Step 8: Upload page
- Implement drag-and-drop `UploadZone`.
- Connect `/upload` page to backend API.

### Step 9: Dashboard page
- Implement `JobsTable` and `StatusBadge`.
- Setup search, filter, and pagination.
- **[NEW]** Show HITL queue flags indicating documents that failed schema, consistency checks, or confidence routing.

### Step 10: Document detail page with Advanced Editor
- Implement `useSSEProgress` hook.
- Implement `ProgressBar` and `DocumentEditor`.
- **[NEW]** Display dynamic per-field confidence scores visually (green/yellow/red).
- **[NEW]** Show validation errors from the Pydantic schema and consistency violations if they exist.
- **[NEW]** Include a "Metrics Dashboard" section for the document showing all four F1 tiers.
- Wire up the detail page with live SSE data and finalize/export actions.

### Step 11: Finalize Output
- Write comprehensive `README.md` containing requested instructions, architecture overview, and setup steps.

### Step 12: End-to-End Testing
- Spin up docker compose.
- Perform sanity checks and upload sample files to test OCR and mock integrations.

## Open Questions

> [!CAUTION]
> The project will be built in `d:\PROJECTS\Async Document Processing System`. Is this path correct?

> [!IMPORTANT]
> The architectural upgrade requires an LLM for multi-modal parsing. Shall I implement mock responses for the LLM extraction in stage 3 for the proof of concept, or would you like me to wire up an actual `OpenAI` client utilizing `GPT-4o` (or similar)?

> [!IMPORTANT]
> Pydantic metrics calculation for KIEval usually requires ground truth labels to compute F1 scores accurately. Should I mock the ground-truth comparison logic for Stage 7's F1 calculation initially?

## Verification Plan

### Automated Tests
- Test pipeline processing end to end and assert the 9 SSE events exist.
- Emulate user edits to assure the `correction_events` database is correctly populated.

### Manual Verification
- `docker-compose up --build`
- Upload a file and trace through the 9 new states visually via the SSE frontend.
- Make a manual edit in the UI and confirm `KIEval_Aligned` is re-calculated in the metrics dashboard.
