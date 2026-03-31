# Async Document Processing Workflow System - V2

This project is an advanced, multimodally powered document analysis workflow system designed to process documents asynchronously using message queues, track progress via SSE (Server-Sent Events), and provide a dynamic, human-in-the-loop (HITL) interface for validation.

## Architecture

The system utilizes a containerized microservices architecture:
1. **Frontend (Next.js)**: Modern React dashboard using App Router, Tailwind CSS, and Axios. Features a real-time progress tracker, multimodal metric display, and a sleek dark-mode aesthetic.
2. **Backend (FastAPI)**: High-performance Python API handling file uploads, database interactions (SQLAlchemy + Alembic), and SSE real-time state streaming.
3. **Database (PostgreSQL)**: Robust relational data storage for document metadata, processing results, and correction event logs.
4. **Message Broker / PubSub (Redis)**: Acts as the broker for Celery tasks and the Pub/Sub backend for pushing SSE updates to the FastAPI server.
5. **Worker (Celery)**: Background worker executing the 9-stage processing pipeline (OCR -> multimodal field extraction -> schema validation -> routing -> consistency checks -> metrics -> DB storage).
6. **LLM Integration (OpenAI)**: Used for precise, zero-shot structured JSON extraction with field-level confidence scores. Fallbacks to mock data if no key is provided.

## Setup Instructions

### 1. Prerequisites
- Docker and Docker Compose
- (Optional) OpenAI API Key for full multimodal parsing.

### 2. Configuration
1. Rename `.env.example` to `.env`.
2. Update the `OPENAI_API_KEY` in `.env` if you want to use the real GPT-4o parsing. If not, the system will seamlessly fallback to mock generation.

### 3. Running the Stack
Ensure Docker is running, then execute:
```bash
docker-compose up --build
```
This will spin up:
- Next.js Frontend: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Flower (Celery Monitoring): `http://localhost:5555`

### 4. Workflow Demonstration
1. Open `http://localhost:3000` and click "Upload Document".
2. Upload any PDF or Image file.
3. You will be redirected to the Document Details page (`/documents/[id]`).
4. Watch the pipeline state dynamically update via Server-Sent Events (SSE).
5. Once complete, view the extracted structured data, confidence scores, and calculated F1 metrics.
6. If the document flagged any consistency checks, it will trigger the Human-In-The-Loop UI. 
7. Modify any fields and click `Save Corrections`. This creates a `correction_event` in Postgres and simulates a recalculation of the `KIEval_Aligned` metric.
8. Click `Finalize` or `Export CSV` to conclude the workflow.

## Advanced Features
- **Field Confidence Routing**: Dynamically displays colored confidence scores per field.
- **Micro-animations**: Frontend interactions are wrapped in dynamic Tailwind transitions.
- **Schema Validations**: Strict Pydantic validators on the backend ensure dirty data cannot pass untouched.
- **Immutable Correction Logs**: User edits map directly to DB logs categorized as additions, deletions, or substitutions.
