# Knowledge retrieval roadmap

Knowledge ingestion is planned for a later phase. Documents will be parsed, chunked, embedded, and stored with mandatory `workspace_id` and document metadata. Retrieval must apply workspace filtering in the database query before similarity ranking. Uploaded files will be size/type validated and stored outside the web root. No vector store or embedding provider is configured in Phase 1.
