# Technical decisions

## Why PostgreSQL

Permit records are relational and compliance-oriented: a permit belongs to a requester, plant, area and equipment, and it accumulates approvals and audit entries. PostgreSQL provides foreign keys, enums, indexes and transactions, which make those relationships explicit and protect data integrity. It also supports `JSONB`, useful for permit-type-specific fields. A document database would make the same constraints application-only.

## Why Prisma

Prisma gives a typed client, readable schema and versioned SQL migrations. For this assignment, the schema itself communicates the domain model clearly, which helps when explaining the data model and state machine. The trade-off is a generated client and a CLI-driven migration workflow; generated files are not committed.

Prisma 6.19.3 is used for its stable `prisma-client-js` generator and simple configuration. `npm audit` reports dev-only advisories in Prisma CLI dependencies; these are not exposed by the API and will be revisited when upgrading to Prisma 7.

## Why a shared Permit entity

All permit types share the same lifecycle (draft, approval, active, suspension, closure, verification). Four separate tables would duplicate that lifecycle and make each state transition need four implementations. One `Permit` table keeps the lifecycle, queries, approvals and audit trail consistent. Adding `EXCAVATION` later only requires a new enum value, type-specific validation and any new fields in the type payload — not a new workflow table.

## Type-specific data

`Permit.typeData` is a PostgreSQL `JSONB` column exposed as Prisma `Json`. It holds payloads such as gas-test results for hot work or isolation points for electrical LOTO.

Trade-off: the database does not validate the shape of each payload. Backend validation uses a Zod discriminated union on `type`, so hot work, confined space, working-at-height and electrical LOTO payloads are checked before any write. A GIN index can be added later if queries need to filter on payload fields. The shared columns remain strongly typed so search and lifecycle logic stay simple.

Permit-type payloads follow the assignment exactly: hot work methods are `WELDING`, `GRINDING`, `CUTTING` and `SOLDERING`; working-at-height access methods are `SCAFFOLD`, `LADDER`, `MEWP` and `ROPE`; electrical LOTO stores separate lists for isolation points, lock numbers and tag numbers. A data migration normalizes legacy JSON without deleting records: known equivalents are converted, ambiguous legacy values are retained with review labels, and unrecognized enum values are left for an operator to reselect.

## Audit trail

`AuditLog` records the permit, actor, action, previous value, new value, comment and timestamp. A migration adds `BEFORE UPDATE` and `BEFORE DELETE` triggers that reject any modification, making the log append-only even for privileged application code. Corrections must be written as new entries. This is a schema-level guarantee, not just an application convention. Automated expiry writes entries with `systemAction = true` and no actor; API reads can present those as `SYSTEM`.

## Deleted and restricted records

Plant, Area and Equipment deletion cascades only where ownership is clear; permits reference their related records with `Restrict` or `SetNull` so historical permits cannot silently lose context. Unique constraints prevent duplicate emails, plant names, area names within a plant, equipment tags within an area, permit numbers and duplicate approval steps.

## Authentication and authorization

Passwords are hashed with bcrypt (cost 12) and never returned by the API. Login uses a signed JWT whose subject is the user ID; the secret comes from `JWT_SECRET` and the API refuses to start if it is shorter than 32 characters. Authentication re-reads the user from the database on each request, so a deleted or role-changed user cannot keep using an old token. Unknown users and wrong passwords return the same error to avoid account enumeration.

A role-to-permission map (`src/modules/authorization/permissions.ts`) is the single source of permission rules. `requireRole` and `requirePermission` are thin middleware wrappers around it, so permit lifecycle checks do not need scattered role conditionals. `requireAreaOwnership` receives a resolver that looks up the area from a database resource (for example `findPermitAreaId`), which prevents a client from supplying a trusted-looking `areaId` in the request body. Non-Area-Owner roles pass this check; Area Owners must match their assigned area.

Zod validates login input. Demo users are seeded with a shared demo password that is hashed on every seed run; these credentials are for the assignment only.

## Permit validation

All create and edit requests pass through one Zod schema. Shared fields are validated once and each permit type contributes its own `typeData` schema. `plannedEndAt` must be after `plannedStartAt`. The requester is always taken from the authenticated token; a client-supplied requester is ignored. Plant, area and equipment relationships are checked in the same database transaction as the write, so an area from another plant or equipment from another area is rejected.

## State machine and approvals

`ALLOWED_TRANSITIONS` in `src/modules/permits/state-machine.ts` is the single source of legal status changes. Routes and services call `assertTransition` before writes. Submission creates two `Approval` rows with `requiredRole` values `AREA_OWNER` and `SAFETY_OFFICER`; `approverId` stays null until the step is decided. The permit becomes `APPROVED` only when no pending approvals remain. Requesters cannot decide their own permits. Area Owners are additionally checked against the permit's server-side area; Safety Officers and Administrators can decide across areas.

## Concurrency

Every lifecycle change runs in a Prisma transaction. Permit updates use `updateMany` guarded by both the expected status and `version`, so a concurrent second transition cannot overwrite the first; it receives HTTP 409 and the client can reload. Approval decisions use `updateMany` guarded by `status = PENDING`, and the `[permitId, step]` unique constraint prevents duplicate approval requirements.

## Expiry and work logs

A permit stores `validUntil`, set on activation from the request or `plannedEndAt`. The API scans due `ACTIVE` and `SUSPENDED` permits at startup and on an interval controlled by `EXPIRY_SCAN_INTERVAL_MS`, writing a system audit entry for each transition to `EXPIRED`. Expired permits cannot be reactivated. `WorkLog` rows are accepted only while a permit is `ACTIVE` and reference the authenticated actor.

## Permit numbers

A PostgreSQL sequence generates monotonic numbers formatted as `PTW-<year>-<six digits>`. The database sequence avoids duplicate numbers under concurrent creation; the unique index on `Permit.permitNumber` remains the final guard.

## Frontend integration

The React client uses a single typed API module built on `fetch`. It sends the JWT as a bearer token, normalizes `{ error }` responses into `ApiError`, and clears the session on HTTP 401. A Vite dev proxy maps `/api` to `http://localhost:5001`, avoiding CORS in local development; `VITE_API_BASE_URL` can override the API origin for other environments.

The app uses the pooled PostgreSQL URL for Prisma Client and a non-pooled `DIRECT_URL` for Prisma CLI migrations. Prisma Migrate takes a session-level advisory lock, so `scripts/migrate-deploy.mjs` skips on Render and migrations are applied as a one-off local step; this prevents a stale or competing lock from blocking normal deploys with P1002.

`localStorage` is used for the demo token because it is simple and works with the current stateless API. The trade-off is XSS exposure, so a production deployment should move to HttpOnly cookies with CSRF protection and refresh-token rotation.

The UI uses role-aware navigation and action rendering only as a usability layer. Every mutation still calls the backend, where permission checks, state transitions and optimistic version guards are enforced.

The area filter uses `GET /api/references/areas`, which reads areas from the database and scopes Area Owners to their assigned area. Plant and equipment options for the permit form are still derived from existing permit responses, and that form accepts IDs directly so the first permit can be created from an empty database. Work-log entries can be added while a permit is active and the detail page shows their live count, but there is no work-log list endpoint. `GET /api/permits/:id/audit` provides chronological audit history on the permit detail page; the activity screen only aggregates counts from the permit register and does not claim to be a full audit timeline.

Permit list date filters use `plannedStartAt` because the assignment defines the planned work window and the register already displays planned start. `startDate` and `endDate` are `YYYY-MM-DD` values applied inclusively in the database, with server-side validation for valid calendar dates and non-reversed ranges.

The "My Approvals Pending" filter reuses `Approval` rows and the same eligibility rules as the decision endpoint. Area Owners match pending `AREA_OWNER` approvals in their assigned area, Safety Officers match pending `SAFETY_OFFICER` approvals across areas, Admins match any pending role, and nobody matches a permit they requested. Requesters receive `403`; the toggle is hidden from them in the client. The filter is combined with existing filters through a Prisma `AND` and is supported by an `Approval(status, requiredRole)` index.

## Remaining work

- Admin-only user management, refresh tokens, password reset and account lockout
- Plant and equipment read endpoints with dependent selects
- Work-log list endpoint with a full activity timeline
- Dashboard conflict detection, QR codes and extension requests
- External scheduler for expiry when the API process is stopped
- Loom walkthrough video and final submission email (external submission artifacts)
