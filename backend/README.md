# Homework Checking Platform Backend

This backend is the formal service layer for the current React prototype. It is designed to replace `frontend/src/lib/mock-db.ts` step by step without changing the frontend information architecture.

## First-Principles Boundary

The backend is responsible for five things:

1. Identity and role control
2. Course, student, assignment, and review persistence
3. File storage for standards, submissions, and generated review artifacts
4. Immediate online grading entry point triggered by student submission
5. Growth-path aggregation for both teacher and student views

The backend is not yet responsible for:

- Production-grade PostgreSQL installation
- Real provider-backed LLM orchestration in the grading path
- Background queue orchestration
- Cloud object storage

## Stack

- `FastAPI`
- `SQLAlchemy 2.x`
- `PostgreSQL`
- `Pydantic`
- local filesystem storage under `storage/`

## Expected Local Paths

- PostgreSQL install directory: `E:\PostgreSQL`
- PostgreSQL data directory: `D:\Desktop\evolution\0 program\homework-checking\platform\backend\storage\postgres-data`
- standards: `storage/standards`
- submissions: `storage/submissions`
- reviews: `storage/reviews`

## Current Status

- FastAPI application scaffold is in place
- ORM models, schemas, core routes, and seed data are implemented
- Current machine does not yet have `psql` available, so PostgreSQL runtime still needs installation
- `app/services/grading_service.py` now executes the online-grading contract immediately after submission
- the current implementation mirrors the `homework-checking` skill output contract and writes:
  - markdown review
  - structured review record JSON
  - database review row
- a real provider-backed model call still needs `MODEL_PROVIDER`, `MODEL_NAME`, and `MODEL_API_KEY`

## Directory Map

- `app/api/`
  - route layer for auth, courses, students, assignments, submissions, reviews, and growth
- `app/core/`
  - settings, security, and dependency injection
- `app/db/`
  - SQLAlchemy base, engine/session, and database initialization
- `app/models/`
  - ORM models
- `app/schemas/`
  - request and response schemas
- `app/services/`
  - storage, standard parsing, grading stub, and seed services
- `storage/`
  - local development storage root
- `tests/`
  - initial API tests

## Bootstrapping

1. Copy `.env.example` to `.env`
2. Install PostgreSQL to `E:\PostgreSQL`
3. Initialize a PostgreSQL cluster pointing to `storage/postgres-data`
4. Create the target database and credentials from `.env`
5. Install dependencies
6. Run:

```bash
python -m app.db.init_db
uvicorn app.main:app --reload
```

## Online Grading Flow

The intended runtime path is:

1. student uploads homework
2. backend stores the source file
3. backend immediately calls the grading execution layer
4. grading layer writes markdown review and canonical review JSON
5. backend persists scores, comments, matrix, and artifact paths into PostgreSQL
6. teacher and student pages read the same persisted result

At the moment, the grading execution layer is a contract-aligned stub. It is shaped to match the local `homework-checking` skill, but a Codex skill itself is not a deployable runtime API. The production version should replace the stub branch with a provider-backed Python grading service that emits the same fields.

## Frontend Migration Sequence

The safest migration order from the current frontend mock layer is:

1. `auth`
2. `levels / courses / students`
3. `assignments`
4. `submissions + immediate grading`
5. `reviews + growth`
