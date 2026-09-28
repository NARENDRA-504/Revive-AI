# Deployment

The compose stack is intended for local development. Production deployment should build immutable frontend/backend images, terminate TLS at a trusted ingress, use managed PostgreSQL and secret storage, run migrations as a release step, and configure backups and monitoring. Do not use the example JWT secret or development CORS settings in production.
