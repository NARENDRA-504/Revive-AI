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

`GET /api/v1/dashboard` derives at-risk totals from sent quotes and inactive leads that have been waiting for at least seven days.

## Leads

- `GET /api/v1/leads` lists leads in the selected workspace.
- `POST /api/v1/leads` creates a lead.
- `PUT /api/v1/leads/{lead_id}` updates a lead.
- `DELETE /api/v1/leads/{lead_id}` deletes a lead.

Lead statuses are `NEW`, `CONTACTED`, `QUALIFIED`, `QUOTED`, `NEGOTIATING`, `WON`, `LOST`, and `INACTIVE`. Leads include contact details, source, estimated value, follow-up dates, and notes.

## Quotes

- `GET /api/v1/quotes` lists quotes in the selected workspace.
- `POST /api/v1/quotes` creates a quote.
- `PUT /api/v1/quotes/{quote_id}` updates a quote.
- `DELETE /api/v1/quotes/{quote_id}` deletes a quote.

Quote statuses are `DRAFT`, `SENT`, `VIEWED`, `NEGOTIATING`, `ACCEPTED`, `REJECTED`, and `EXPIRED`. Quote numbers must be unique within a workspace. A linked lead must belong to the same workspace.

## Revenue opportunities

`GET /api/v1/opportunities` returns deterministic follow-up opportunities for active leads and sent quotes waiting at least seven days. Each result includes its source record, amount, wait time, priority, reason, and suggested next step. Priority comes from fixed age and value thresholds; no LLM is used for detection and no message is sent automatically.

Every lead and quote endpoint requires the protected-request headers described above. The API checks membership first, then scopes record queries to the selected workspace.

