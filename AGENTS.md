# Project instructions

- Implement the product in phases; do not claim later-phase capabilities before they exist.
- Keep deterministic business rules separate from AI reasoning and execution.
- Scope all tenant-owned reads and writes to a verified workspace membership.
- Use Pydantic for API validation, SQLAlchemy for persistence, and Alembic for schema changes.
- Keep secrets in environment variables; update `.env.example` when adding configuration.
- Add focused tests for security and core behavior; run them before declaring a phase verified.
