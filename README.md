# SuperFlow

SuperFlow is a workshop management system for service advisors.

## Developer documentation

Backend docs added for new developers:

- `docs/backend-overview.md`
- `docs/backend-modules.md`
- `docs/backend-request-flows.md`
- `docs/backend-business-rules.md`
- `docs/backend-entity-map.md`
- `docs/backend-api-map.md`

Recommended reading order:
1. `docs/backend-overview.md`
2. `docs/backend-modules.md`
3. `docs/backend-request-flows.md`
4. `docs/backend-business-rules.md`
5. `docs/backend-entity-map.md`
6. `docs/backend-api-map.md`

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
