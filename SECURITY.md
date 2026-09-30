# Security

Phase 1 uses Argon2 password hashes and expiring signed bearer tokens. Protected endpoints require authentication and verify that the requesting user belongs to the selected workspace. The workspace ID is not trusted by itself.

Set a unique, random `JWT_SECRET` in deployment. Never commit `.env`, tokens, database credentials, or model API keys. Production deployment must use HTTPS, managed secret storage, database backups, and appropriate rate limits. Email and other external actions are not enabled in this phase.
