# SuperFlow — Automotive Workshop Management Platform

**SuperFlow (PrioraFlow)** is a multi-tenant workshop management application for automotive service operations. It connects service reception, technicians, and customers across the lifecycle of a workshop job—from intake and inspection to estimates, customer decisions, and closure.

This repository includes the NestJS backend, a Next.js web client, and a Flutter application.

## What the platform does

- **Customer and vehicle records:** customer profiles, vehicle lookup, and service history.
- **Job management:** create and assign jobs, track workshop stages, and record status changes.
- **Digital inspections:** configurable inspection templates, technician findings, and attached media.
- **Estimates:** grouped line items, backend-calculated totals, and change history.
- **Customer authorisation:** token-based customer portal for line-by-line approval, decline, or deferral.
- **Deferred work:** retain postponed recommendations for follow-up and future bookings.
- **Operations:** notifications, audit records, scheduled archiving, and administrative configuration.

## Technology stack

| Area | Technologies |
| --- | --- |
| API | NestJS 11, TypeScript, Prisma |
| Web | Next.js 16, React 19, Zustand, Tailwind CSS |
| Mobile | Flutter (included in this repository) |
| Database | MySQL / MariaDB |
| Background processing | Redis, BullMQ, scheduled jobs |
| Media | S3-compatible object storage |
| Infrastructure | Docker Compose, Traefik, GitHub Actions |
| Security | JWT, refresh-token rotation, permissions, tenant isolation, request validation |

## Architecture overview

```text
                 Web Client / Flutter Client
                             |
                         REST API
                             |
                     NestJS Application
                             |
        +--------------------+--------------------+
        |                    |                    |
  Access & Context     Business Modules      Background Work
  - JWT / permissions  - Jobs                - Notifications
  - Workshop guard     - Inspections         - BullMQ / Redis
  - Plan feature guard - Estimates           - Scheduled archive
  - Tenant context     - Authorisation
                       - Deferred work
        |                    |
        +---------- Prisma --+
                    |
              MySQL / MariaDB

      Media files --> S3-compatible object storage
```

The backend uses feature-oriented NestJS modules. Controllers handle API concerns, while services implement business rules and data access.

### Engineering decisions

**Multi-tenant data isolation.** Workshop context is propagated using `AsyncLocalStorage`. The Prisma tenant extension scopes workshop-owned data; unscoped database access is reserved for explicitly cross-tenant operations.

**Layered authorisation.** JWT authentication, permission checks, workshop context, and subscription feature gates enforce distinct access boundaries.

**Explicit job lifecycle.** A state machine governs job status transitions and status history supports traceability.

**Durable notifications.** Notification records are written to the database before queue delivery. BullMQ workers process deliveries, with recovery for queued records after interruptions.

**Customer portal security.** Customer approvals use expiring, hashed tokens. Customer-visible media is served through validated API routes rather than exposed as unrestricted object-storage URLs.

**History-aware estimates.** Estimate changes are recorded, and referenced lines are preserved when bulk updates would otherwise remove historical links.

## Typical workflow

```text
Customer & vehicle intake
          |
       Create job
          |
   Digital inspection
          |
   Estimate preparation
          |
  Customer approval link
          |
 Approve / Decline / Defer
          |
  Workshop work & quality check
          |
      Job closure
```

Deferred or declined items remain available for future follow-up.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/` | NestJS API, domain modules, guards, services |
| `prisma/` | Database schema and migrations |
| `superflow-web/` | Next.js web application |
| `prioraflow_flutter_app/` | Flutter application |
| `docs/` | Backend architecture and API references |
| `test/` | Tests and security-related checks |
| `.github/` | GitHub Actions workflows |
| `docker-compose.yml` | Service and deployment configuration |

## Local development

For the API:

```bash
npm install
npx prisma generate
npm run start:dev
```

For the web client:

```bash
cd superflow-web
npm install
npm run dev
```

Configure the required environment variables using `.env.example` as a reference. A compatible database and other configured infrastructure services are required.

Useful backend commands:

```bash
npm run build
npm test
npm run test:auth-security
npm run test:file-security
npm run test:tenant
```

Some security scripts require a running application and database.

## Technical documentation

For a deeper look at the implementation:

1. [Backend overview](docs/backend-overview.md)
2. [Modules and responsibilities](docs/backend-modules.md)
3. [End-to-end request flows](docs/backend-request-flows.md)
4. [Business rules](docs/backend-business-rules.md)
5. [Entity map](docs/backend-entity-map.md)
6. [API map](docs/backend-api-map.md)
7. [Permissions reference](docs/permissions-reference.md)

## Deployment notes

The current Docker Compose deployment expects existing VPS infrastructure. The following instructions document those dependencies and the deployment process.

## Current deployment requirements

This project currently expects existing infrastructure on the VPS:

1. Docker + Docker Compose installed
2. A domain pointed to the VPS
3. Traefik already running on Docker network:
   - `n8n_default`
4. MariaDB already available on external Docker network:
   - `mariadb-bzki_default`
   - hostname used by the app: `mariadb`
5. One real local `.env` file in the project root
6. The repo code cloned on the server

## Important note

This app is not yet a fully standalone fresh-VPS deploy.

`docker-compose.yml` expects:
- external Traefik network: `n8n_default`
- external DB network: `mariadb-bzki_default`

So on a fresh VPS, either:

### Option A — use existing infrastructure
Use an already-running Traefik + MariaDB setup.

### Option B — make the app self-contained
This would require adding MariaDB to Docker Compose and simplifying/removing the external Traefik dependency.

## Manual deploy steps

### 1) Clone the repo
```bash
git clone <repo-url> /home/super-service-app
cd /home/super-service-app
```

### 2) Create the env file
```bash
cp .env.example .env
nano .env
```

Fill at least these values:
- `APP_DOMAIN`
- `CORS_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- `CUSTOMER_PORTAL_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

## 3) Build and start
```bash
docker compose build api web
docker compose up -d redis api web
```

If MinIO is also needed:
```bash
docker compose up -d
```

## 4) Check health
```bash
docker compose ps
docker compose logs api --tail 50
docker compose logs web --tail 50
```

## 5) Test login
Open:
- `https://YOUR_DOMAIN/login`

Then log in with a valid seeded user.

## GitHub Actions deploy

Required GitHub secrets:
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

Important:
- the workflow deploys from `main`
- the VPS must already contain a valid `.env` in `/home/super-service-app`

Then deployment can happen automatically on push to `main`.

## Minimum deployment checklist

- domain ready
- Traefik exists
- MariaDB exists
- `.env` filled
- run:

```bash
docker compose build api web
docker compose up -d redis api web
```

## Future improvement

If needed, this project can be converted into a true fresh-VPS deploy by:
- adding MariaDB inside Compose
- simplifying the network assumptions
- documenting a full bootstrap flow
