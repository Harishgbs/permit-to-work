# Permit to Work

A full-stack **Permit to Work (PTW)** module for a Computerized Maintenance Management System (CMMS). The goal is to provide a safety authorization workflow for hazardous maintenance activities such as hot work, confined space entry, working at height, and electrical lockout/tagout.

This repository currently contains a working development foundation: application shell, REST API with a health check, email/password authentication, role and area authorization, PostgreSQL schema with migrations and seed data, and documentation. The permit workflow itself is intentionally not implemented yet.

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
│       ├── components/     Shared layout components
│       └── pages/          Dashboard and placeholders
├── server/                 Express + TypeScript API
│   ├── src/
│   │   ├── config/         Environment and Prisma client
│   │   ├── middleware/     Authentication, authorization, area access, errors
│   │   ├── modules/        Auth and authorization domain logic
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

```bash
cd ~/dev/permit-to-work
npm install
```

## Environment configuration

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set `DATABASE_URL` to your PostgreSQL connection string. The API port defaults to `5001` in `.env.example` (port 5000 is often used by other local services). Set `JWT_SECRET` to a random string of at least 32 characters (for example `openssl rand -hex 32`) and optionally `JWT_EXPIRES_IN` (default `1h`). `.env` is gitignored; never commit real credentials.

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

The initial migrations create the User, Plant, Area, Equipment, Permit, Approval and AuditLog tables. A second migration adds database triggers that make `AuditLog` append-only.

The seed script is idempotent: it creates four users (one per role), two plants, five areas, six equipment items and ten permits across all permit statuses. Demo passwords are hashed with bcrypt. Running the seed again updates existing demo records instead of creating duplicates.

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

## Verification commands

```bash
npm run typecheck    # TypeScript checks for client and server
npm test             # Vitest + Supertest API tests
npm run build        # production build of client and server
```

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

### Current limitations

- No public registration or admin user management endpoint; user management is deferred.
- No refresh tokens, password reset, email verification or account lockout.
- The frontend does not yet store or send the JWT; it remains a placeholder shell.
- No permit creation workflow, approval state machine, audit timeline, dashboards, expiry engine, QR codes, conflict detection or permit type-specific validation.

See `docs/technical-decisions.md` for design notes and remaining work.
