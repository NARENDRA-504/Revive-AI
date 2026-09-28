# API

All API routes use the `/api/v1` prefix. Protected requests use `Authorization: Bearer <access_token>` and `X-Workspace-ID: <workspace UUID>`.

## Register

`POST /api/v1/auth/register`

```json
{"name":"Asha Rao","email":"asha@example.com","password":"a-long-password","workspace_name":"Asha Consulting"}
```

Returns an access token, user, and initial workspace. Email addresses are normalized to lowercase.

## Login

`POST /api/v1/auth/login` accepts email and password and returns the same token envelope.

## Current user

`GET /api/v1/auth/me` returns the authenticated user and their workspace memberships.

## Dashboard

`GET /api/v1/dashboard` returns the selected workspace name and zeroed Phase 1 revenue metrics. Future phases will derive these values from persisted business records.
