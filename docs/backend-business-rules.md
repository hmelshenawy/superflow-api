# SuperFlow Backend Business Rules

This file captures the most important rules a developer must know before changing backend logic.

## 1. Job status rules

Source of truth:
- `src/jobs/jobs.state-machine.ts`

Valid statuses:
- `booked`
- `checking`
- `estimate_sent`
- `approved`
- `in_progress`
- `waiting_parts`
- `quality_check`
- `ready`
- `closed`

Transitions are intentionally controlled, not fully free-form.

Examples:
- `booked -> checking`
- `checking -> estimate_sent`
- `estimate_sent -> approved`
- `approved -> in_progress`
- `quality_check -> ready`
- `ready -> closed`

Backtracking is allowed only in selected operational cases.

### Side effects on status changes
- moving to `ready` sets `completed_at`
- moving to `closed` sets `invoiced_at`
- moving away from `closed` clears `invoiced_at` and `archived_at`
- moving away from `ready` back to an earlier stage clears `completed_at`

## 2. Inspection rules

- one inspection per job
- creating an inspection auto-moves a `booked` job to `checking`
- inspection becomes read-only when status is:
  - `submitted`
  - `reviewed`
  - `approved`
- reopening moves it back to `in_progress`

## 3. Estimate rules

- financial totals are calculated on the backend, not trusted from the client
- estimate lines may belong to:
  - a grouped custom quote section (`quote_group_id`)
  - an inspection response (`inspection_response_id`)
  - general/other free lines
- when bulk replacing lines, old referenced rows are preserved instead of deleted if they are linked to:
  - approval decisions
  - deferred work
  - estimate history

## 4. Approval link rules

- raw approval tokens are never stored directly; only SHA-256 hashes are stored
- approval links expire after 7 days by default
- approval link generation usually moves the job to `estimate_sent`
- portal tokens can become invalid for four main reasons:
  - not found
  - revoked
  - expired
  - already used

## 5. Customer decision rules

- decisions are submitted per estimate line
- submitted line ids must belong to the job tied to the token
- token is marked used after decision submission
- a portal submission can move the job to `approved`
- declined and deferred lines create `deferred_work` records if one does not already exist

## 6. Deferred work rules

Deferred work represents estimate items the customer did not approve immediately.

Typical creation path:
- customer declines or defers an estimate line in the portal

It can later be:
- reminded
- booked into a new job
- closed/expired

## 7. Media rules

- media records are soft-deleted, not hard-deleted in normal flows
- staff downloads use signed or streamed API routes
- customer portal never gets raw internal bucket URLs
- upload filenames are normalized to a job-number/timestamp format
- inspection response `media_count` is maintained by backend logic

## 8. Notification rules

- notifications are first-class DB rows, not just transient queue jobs
- queueing is optional delivery machinery; DB remains authoritative
- if no delivery webhook is configured for a channel, notification is marked sent through `noop`
- failures are retried through BullMQ and also recoverable from DB queued state

## 9. Auth/session rules

- access token is JWT-based
- refresh token is stored hashed in DB
- refresh rotates the token
- logout revokes all active refresh tokens for the user
- password change revokes all but the most recent active session
- login and refresh endpoints are throttled more aggressively than normal routes

## 10. Archiving rules

Current scheduler behavior:
- all jobs in `closed` status with `archived_at = null` are archived
- this runs:
  - at startup (catch-up)
  - nightly at midnight UTC

Important:
- archiving is now immediate by status, not delayed by 24 hours
- the manual archive endpoint still requires the job to already be closed

## 11. Frontend/backend contract rules worth protecting

These are easy to break accidentally:

- auth responses currently use `accessToken` / `refreshToken`
- `/api/auth/me` must return role information usable by frontend guards
- `getAuthStatus()` must continue returning `hasActiveToken`
- customer portal payload depends on grouped estimate output shape
- media payloads often rely on backend-generated proxy URLs

## 12. Safe change guidance

Before changing backend behavior in this project, check:

1. Is this rule encoded in one service only, or repeated elsewhere?
2. Does the frontend depend on the exact response shape?
3. Does the rule affect audit/history/deferred/notification side effects?
4. Does the customer portal rely on this field or grouping order?
5. Is there a background job or polling flow depending on this status/value?

If unsure, document first, refactor second.
