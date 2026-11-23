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

Trade-off: the database does not validate the shape of each payload. Backend validation for each permit type will be added with the permit creation workflow, and a GIN index can be added later if queries need to filter on payload fields. The shared columns remain strongly typed so search and lifecycle logic stay simple.

## Audit trail

`AuditLog` records the permit, actor, action, previous value, new value, comment and timestamp. A migration adds `BEFORE UPDATE` and `BEFORE DELETE` triggers that reject any modification, making the log append-only even for privileged application code. Corrections must be written as new entries. This is a schema-level guarantee, not just an application convention.

## Deleted and restricted records

Plant, Area and Equipment deletion cascades only where ownership is clear; permits reference their related records with `Restrict` or `SetNull` so historical permits cannot silently lose context. Unique constraints prevent duplicate emails, plant names, area names within a plant, equipment tags within an area, permit numbers and duplicate approval steps.

## Remaining work

- Authentication and authorization with the four roles
- Server-side permit validation, including per-type `typeData` rules
- State machine and guarded transitions (approve, activate, suspend, expire, close, verify)
- Area-owner restrictions based on assigned area
- Audit timeline endpoint and UI
- Dashboard filters, expiry engine, conflict detection, QR codes and extension requests
- Deployment configuration and a presentation walkthrough
