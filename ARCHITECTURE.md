# Architecture

## Phase 1 request path

```text
React client → FastAPI routes → authentication/workspace dependencies → SQLAlchemy → PostgreSQL
```

`backend/app/api` owns HTTP contracts; `models.py` owns persistence; `schemas.py` validates input and output; `security.py` handles password hashing and signed access tokens. Business logic stays in the API/service layer, separate from persistence.

## Tenant isolation

Users belong to workspaces through `workspace_members`. The initial registration flow creates a workspace and owner membership atomically. Protected routes require a valid bearer token and an explicit workspace selection. The API verifies membership before returning workspace data. Tenant-owned tables introduced in later phases must include `workspace_id`, and every read or write must constrain by that ID.

## Security boundaries

- Passwords are hashed with Argon2; plaintext passwords are never stored.
- Access tokens are signed with an environment-provided secret and have a bounded lifetime.
- The browser stores the short-lived token in memory; no provider/database secret is exposed to the frontend.
- External actions will require structured decisions, deterministic validation, explicit approval, and audit records. No external action runs in Phase 1.

## Planned service boundaries

```text
Business data → deterministic opportunity detector → AI analysis/retrieval
              → safety validator → approval queue → action executor → audit log
```

The detector remains deterministic. LLM reasoning will be structured and advisory, and must never call external providers directly.
