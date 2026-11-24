# Permit to Work

A full-stack **Permit to Work (PTW)** module for a Computerized Maintenance Management System (CMMS). The goal is to provide a safety authorization workflow for hazardous maintenance activities such as hot work, confined space entry, working at height, and electrical lockout/tagout.

This repository implements the full-stack module: React client, Express REST API, PostgreSQL/Prisma schema with migrations and seed data, email/password authentication, role and area authorization, permit creation with type-specific validation, a guarded approval/activation/suspension/expiry/closure state machine, work logs, audit history, dashboard, and automated tests.

## Domain context

A CMMS manages maintenance work, assets and records. A Permit to Work is a controlled document that checks hazards, required precautions and approvals **before** hazardous work starts. It supports states such as draft, pending approval, active, suspended, expired and closed, with an immutable audit trail for safety compliance.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router, Lucide React |
| Backend | Node.js, Express, TypeScript, REST, bcryptjs, JSON Web Tokens, Zod |
| Database | PostgreSQL, Prisma ORM |
| Testing | Vitest, Supertest |
| Tooling | npm workspaces, Git, GitHub CLI |

## Repository structure

```
permit-to-work/
├── client/                 React + Vite frontend
│   └── src/
│       ├── components/     Shared UI and layout
│       ├── features/       Auth, dashboard, permits, approvals and audit
│       └── lib/            API client, filters, permissions and formatting
├── server/                 Express + TypeScript API
│   ├── src/
│   │   ├── config/         Environment and Prisma client
│   │   ├── middleware/     Authentication, authorization, area access, errors
│   │   ├── modules/        Auth, authorization and permit domain logic
│   │   ├── routes/         HTTP routes
│   │   └── utils/          Shared helpers
│   ├── prisma/             Schema, migrations and seed data
│   └── tests/              API tests
├── docs/                   Technical decision notes
└── package.json            npm workspace scripts
```

## Prerequisites

- Node.js 20 or newer (verified with Node 24) and npm
- A reachable PostgreSQL database
- Git
- Optional: Podman or Docker to run PostgreSQL locally without a system install

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Harishgbs/permit-to-work.git
cd permit-to-work
npm install
```

## Environment configuration

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string. Set `DIRECT_URL` to a non-pooled connection string for Prisma CLI migrations; locally it can be the same value as `DATABASE_URL`. The API port defaults to `5001` in `.env.example` (port 5000 is often used by other local services). Set `JWT_SECRET` to a random string of at least 32 characters (for example `openssl rand -hex 32`) and optionally `JWT_EXPIRES_IN` (default `1h`). `EXPIRY_SCAN_INTERVAL_MS` controls the automatic expiry scan (default `60000`). `.env` is gitignored; never commit real credentials.

A lightweight local database can be started with Podman using the same file:

```bash
podman run -d --name ptw-postgres -p 5446:5432 \
  --env-file server/.env \
  -v ptw-postgres-pgdata:/var/lib/postgresql \
  docker.io/library/postgres:latest
```

Set `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` in `server/.env` before running this command, and use the matching port in `DATABASE_URL`.

## Database setup

Prisma commands run from the repository root through npm workspaces:

```bash
npm run prisma:validate -w server   # validate schema
npm run prisma:generate -w server   # generate typed client
npm run prisma:migrate -w server    # create and apply migrations in development
npm run db:seed -w server           # load repeatable demo seed data
```

The initial migrations create the User, Plant, Area, Equipment, Permit, Approval and AuditLog tables. A second migration adds database triggers that make `AuditLog` append-only. The permit lifecycle migration adds `WorkLog`, role-based approval requirements, permit validity/version fields, nullable system audit actors and a PostgreSQL sequence for permit numbers.

The seed script is idempotent: it creates four users (one per role), two plants, five areas, six equipment items and ten permits across all permit statuses, with approvals where applicable. Demo passwords are hashed with bcrypt. Running the seed again updates existing demo records instead of creating duplicates. Deployed environments should use `npm run prisma:migrate:deploy -w server`; only seed a deployment when demo data is intentionally wanted.

**Demo-only credentials** (development and assignment presentation only, never use in production):

| Email | Role | Password |
| --- | --- | --- |
| `requester@example.com` | REQUESTER | `DemoPass123!` |
| `area-owner@example.com` | AREA_OWNER | `DemoPass123!` |
| `safety-officer@example.com` | SAFETY_OFFICER | `DemoPass123!` |
| `admin@example.com` | ADMIN | `DemoPass123!` |

## Development commands

```bash
npm run dev:client   # frontend at http://localhost:5173
npm run dev:server   # API at http://localhost:5001
```

## Deployed application

- Frontend (Vercel): https://permit-to-work-kappa.vercel.app
- Backend API (Render): https://permit-to-work.onrender.com/api
- API health: https://permit-to-work.onrender.com/api/health

The deployed frontend is built with `VITE_API_BASE_URL` set to the Render API base URL.

### Frontend configuration

The Vite dev server proxies `/api` to `http://localhost:5001`, so the browser calls same-origin URLs and CORS is not needed in development. Set `VITE_API_BASE_URL` before building if the API is hosted elsewhere; it defaults to `/api`.

The frontend stores the JWT in `localStorage` and sends it as a bearer token on every API request. This keeps the demo simple but is vulnerable to XSS; production should prefer an HttpOnly, SameSite cookie with CSRF protection and refresh-token rotation.

Navigation and action buttons are role-aware, but the backend remains the authority for authorization. The UI does not expose placeholder admin CRUD screens; audit history is read-only and sourced from recorded backend events.

## Permit workflow API

All permit endpoints require `Authorization: Bearer <token>`. The requester is derived from the token, not from the request body. Plant, area and equipment IDs must exist, the area must belong to the plant, and the equipment must belong to the area.

```
POST   /api/permits                     create a draft
GET    /api/permits                     list permits with page/pageSize/status/type/plantId/areaId/startDate/endDate/myApprovalsPending/search filters
GET    /api/references/areas             list real areas available to the current user
GET    /api/permits/:id                 get one permit
GET    /api/permits/:id/audit           get chronological audit history for one permit
PATCH  /api/permits/:id                 replace draft details
POST   /api/permits/:id/submit          submit for approval
POST   /api/permits/:id/approve         approve your role's pending step
POST   /api/permits/:id/reject          reject with a reason
POST   /api/permits/:id/activate        activate an approved permit
POST   /api/permits/:id/suspend         suspend an active permit with a reason
POST   /api/permits/:id/resume          resume a suspended permit
POST   /api/permits/:id/close           close work
POST   /api/permits/:id/verify          safety verification of closure
POST   /api/permits/:id/cancel          cancel a non-terminal permit
POST   /api/permits/:id/work-logs       add a work log while active
```

`startDate` and `endDate` are `YYYY-MM-DD` values that filter `plannedStartAt` inclusively, and the API rejects reversed ranges. `myApprovalsPending=true` returns permits with pending `Approval` rows that the authenticated user can decide: Area Owners in their area, Safety Officers across areas, and Admins for either role; requesters receive `403`.

Shared fields are `contractorTeam`, `workDescription`, `plantId`, `areaId`, `equipmentId`, `workLocation`, `plannedStartAt`, `plannedEndAt`, `identifiedHazards`, `requiredPpe` and `precautions`. `typeData` is validated with a Zod discriminated union:

- `HOT_WORK`: hot work method (`WELDING`, `GRINDING`, `CUTTING` or `SOLDERING`), fire watch, extinguisher type, combustibles clearance radius, LEL/O2 gas readings and timestamp.
- `CONFINED_SPACE`: space ID, entry point, O2/LEL/H2S/CO readings and timestamp, attendant, rescue plan, ventilation and entry/exit log.
- `WORKING_AT_HEIGHT`: height, access method (`SCAFFOLD`, `LADDER`, `MEWP` or `ROPE`), fall arrest, anchor check and barricading.
- `ELECTRICAL_LOTO`: equipment tag, voltage, isolation point list, lock numbers, tag numbers, earthing applied, tested-dead confirmation and who performed it.

A data migration aligns legacy `typeData`: `BRAZING` becomes `SOLDERING`; recognizable access-method text becomes the matching enum; old LOTO counts and combined lock/tag numbers are retained as review-labelled entries because the original records did not distinguish those values. Unrecognized legacy enum values are preserved and must be reselected before the next write.

Example `HOT_WORK` payload:

```json
{
  "type": "HOT_WORK",
  "contractorTeam": "Acme Maintenance",
  "workDescription": "Replace pump bearing",
  "plantId": "<uuid>",
  "areaId": "<uuid>",
  "equipmentId": "<uuid>",
  "workLocation": "Maintenance Bay A",
  "plannedStartAt": "2026-11-24T08:00:00.000Z",
  "plannedEndAt": "2026-11-24T16:00:00.000Z",
  "identifiedHazards": "Sparks and hot surfaces",
  "requiredPpe": "Gloves, goggles, FR clothing",
  "precautions": "Fire watch present",
  "typeData": {
    "hotWorkType": "WELDING",
    "fireWatch": true,
    "extinguisherType": "CO2",
    "combustiblesClearanceRadiusMetres": 11,
    "gasReadings": { "lel": 0, "o2": 20.9, "recordedAt": "2026-11-24T07:45:00.000Z" }
  }
}
```

### Lifecycle rules

`DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → CLOSED → CLOSED_VERIFIED`; `ACTIVE ↔ SUSPENDED`; non-terminal states may be cancelled; `PENDING_APPROVAL → REJECTED`; `ACTIVE`/`SUSPENDED → EXPIRED`.

Submission creates two approval requirements: area owner (step 1) and safety officer (step 2). Both must approve before activation. Requesters cannot approve their own permits, Area Owners only approve their assigned area, Safety Officers approve across areas, and administrators can decide either pending approval role. Permit transitions use Prisma transactions and an optimistic `version` guard, so concurrent approvals or transitions cannot silently overwrite each other.

Activation requires a time at or after `plannedStartAt` and sets `validUntil` from the request or `plannedEndAt`. The API runs an expiry scan at startup and every `EXPIRY_SCAN_INTERVAL_MS`, marking due `ACTIVE`/`SUSPENDED` permits as `EXPIRED` with a system audit entry. Expired permits cannot be reactivated; a new permit is required. Work logs are accepted only while a permit is `ACTIVE`.

## Technical decisions

- PostgreSQL and Prisma were chosen for relational integrity, typed queries, enums and versioned SQL migrations. One shared `Permit` table avoids four duplicate lifecycles; type-specific fields live in `typeData` JSONB and are validated by Zod.
- Prisma Client uses the pooled `DATABASE_URL`; Prisma CLI migrations use the non-pooled `DIRECT_URL`. Migration advisory locks require a stable database session, so using the pooler for migrations can cause intermittent P1002 timeouts.
- Authorization is centralized in a role-to-permission map and server-side middleware. Area Owners are restricted to their assigned area; Safety Officers act across areas; administrators follow the existing permission and approval rules.
- Lifecycle writes run in transactions with a status-and-version guard to prevent concurrent transitions from silently overwriting each other. Audit entries are append-only at the database level.
- The JWT is stored in `localStorage` for a simple stateless demo. This is XSS-sensitive; HttpOnly cookies, CSRF protection and refresh-token rotation are future production work.
- Permit-list date filters match `plannedStartAt`. "My Approvals Pending" matches real pending `Approval` rows and the same eligibility rules used by the decision endpoint, not just permit status.
- Expiry is handled by an API process scan. A separate scheduler would be needed for expiry while the API is stopped.

## Verification commands

```bash
npm run typecheck    # TypeScript checks for client and server
npm test             # Vitest + Supertest API tests
npm run build        # production build of client and server
```

Server tests need `DATABASE_URL` pointing to a disposable PostgreSQL database with migrations applied. Integration tests leave append-only audit fixtures in place instead of deleting them.

## Deployment

The repository includes `vercel.json` and `render.yaml` for Vercel and Render, with Neon PostgreSQL as the production database. See `docs/deployment.md` for platform setup steps and the complete list of required environment variables. Production secrets are entered only in the platform dashboards; `.env` files are gitignored and no secret values are stored in the repository.

The Render service binds to the platform-provided `PORT` on `0.0.0.0`, allows origins listed in `CORS_ORIGIN`, and runs `prisma migrate deploy` before startup. Seeding is manual and only appropriate when demo data is wanted.

## Health check

```
GET http://localhost:5001/api/health
```

Example response:

```json
{
  "status": "ok",
  "service": "permit-to-work-api",
  "timestamp": "2026-11-23T10:00:00.000Z"
}
```

## Authentication and authorization

### Endpoints

```
POST /api/auth/login   # body: { "email": "...", "password": "..." }
GET  /api/auth/me      # header: Authorization: Bearer <token>
```

Obtain a JWT and use it on a protected request:

```bash
TOKEN=$(curl -sS -X POST http://localhost:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"DemoPass123!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token')

curl -sS http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Passwords are hashed with bcrypt before storage. Login failures return a generic `401 Invalid email or password` for both unknown users and wrong passwords so accounts cannot be enumerated. Responses never include `passwordHash`.

Authorization is centralized in reusable middleware: `requireRole(...roles)` and `requirePermission(permission)` are backed by a role-to-permission map that can be extended for permit lifecycle actions. `requireAreaOwnership(resolveAreaId)` resolves the area from a database resource server-side; it does not accept area IDs from request bodies. Area Owners can only act on resources in their assigned area.

## Known limitations

- No public registration or admin user-management endpoint.
- No refresh tokens, password reset, email verification or account lockout.
- No plant or equipment reference endpoints; the permit form suggests IDs from existing permits and accepts valid IDs directly. `GET /api/references/areas` exists for the permit-list area filter.
- No work-log list endpoint; the permit detail page shows the live work-log count and accepts new entries while a permit is active.
- The dashboard exists with overview statistics, expiring-soon indicators and an approvals link, but conflict detection, QR codes and extension requests are not implemented.
- Expiry scanning runs only while the API process is running. The startup scan catches up after a restart, but a separate scheduler would be needed for expiry while the API is stopped.
- The JWT is kept in `localStorage`, so client-side script exposure is possible.
- Integration tests create unique fixture records and leave append-only audit entries in place; use a disposable database for repeated runs.

## What would be built next

1. Admin user management and authentication hardening (HttpOnly cookies, CSRF protection, refresh tokens, password reset and account lockout).
2. Plant and equipment read endpoints with dependent form selects.
3. A work-log list endpoint and a full activity timeline.
4. Dashboard conflict detection, QR codes and extension requests.
5. An external scheduler for expiry when the API process is stopped.

## AI usage

AI tools assisted with code scaffolding, refactors, debugging, test cases and documentation during development. The developer reviewed every change, ran typechecks, tests and builds, verified migrations, and understands the implementation.

See `docs/technical-decisions.md` for design notes and `docs/deployment.md` for platform setup.
