# ReviveAI

ReviveAI helps small service businesses find stalled leads and quotations, understand why revenue is at risk, and prepare safe, human-approved recovery actions.

## Current phase: core business data

The foundation includes a React client, FastAPI API, PostgreSQL persistence, password-based authentication, workspace membership, Docker development environment, and Alembic migrations. Core data includes workspace-scoped lead and quote management with create, list, update, and delete operations. The dashboard derives its stalled lead and quote totals from saved workspace records, and a deterministic opportunity feed explains why each item is waiting and what to review next.

## Stack

- React + TypeScript + Vite
- Python 3.12, FastAPI, Pydantic, SQLAlchemy 2, Alembic
- PostgreSQL 16
- JWT access tokens and Argon2 password hashing

## Run locally

1. Copy `.env.example` to `.env` and set a unique `JWT_SECRET`.
2. Run `docker compose up --build`.
3. Open <http://localhost:5173>. API docs are at <http://localhost:8000/docs>.

The backend container applies Alembic migrations before starting. For local backend-only work, create a virtual environment in `backend`, install `.[dev]`, set `DATABASE_URL`, run `alembic upgrade head`, then run `uvicorn app.main:app --reload` from `backend`.

Authentication currently provides registration, sign-in, in-memory browser sign-out, profile updates, and workspace creation/renaming. Password reset is not enabled yet because no email delivery provider is configured; do not add a reset endpoint that exposes reset tokens directly to callers.

## API endpoints

- `POST /api/v1/auth/register` — create a user and their first workspace
- `POST /api/v1/auth/login` — authenticate and return a bearer token
- `GET /api/v1/auth/me` — current user and workspace memberships
- `GET /api/v1/dashboard` — workspace-scoped stalled lead and quote totals
- `/api/v1/leads` — workspace-scoped lead CRUD
- `/api/v1/quotes` — workspace-scoped quote CRUD, including validation of linked leads
- `GET /api/v1/opportunities` — rules-based stalled lead and quote detection
- `GET /health` — liveness check

Every tenant-owned query is scoped by an authenticated workspace membership. Secrets are read from environment variables and never sent to the browser.

## Remaining product phases

Next: conversation records and customer interactions, AI-assisted recommendations, retrieval over business policies, and human-approved action execution. Email integrations and password reset require a configured delivery provider. See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and tenancy rules.

