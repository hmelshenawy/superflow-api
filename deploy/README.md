# Production Deploy Notes

## What was added
- `docker-compose.yml` for `api`, `web`, and `redis`
- Traefik labels on `api` and `web`
- `superflow-web/Dockerfile`
- `.env.example`
- `.github/workflows/deploy.yml`

## Reverse proxy model
This VPS already runs **Traefik** on the external `n8n_default` Docker network.

This stack is now adapted to that setup on a **single domain**:
- `https://$APP_DOMAIN` -> `web`
- `https://$APP_DOMAIN/api` -> `api`
- `https://$APP_DOMAIN/portal` -> `api` customer-portal endpoints

## Safe deploy
```bash
cp .env.example .env
# edit with real domain + secrets

docker compose build api web
docker compose up -d redis api web
```

## Schema change checklist
This project uses manual SQL migrations for now.

Before deploying code that changes `prisma/schema.prisma` or expects new DB columns/tables/enums:

- Add a dated SQL file under `scripts/sql/`.
- Review the SQL for destructive changes.
- Apply the SQL to the VPS database before or during the deploy window.
- Record the applied file name, git commit, date, and operator.
- Deploy the app.
- Run the smoke checks below.

Do not rely on deploy to mutate the database automatically. See `scripts/sql/README.md`.

## Post-deploy smoke checks
GitHub Actions now checks these local URLs on the VPS after containers restart:

```bash
wget -qO- http://127.0.0.1:${API_BIND_PORT:-3000}/health
wget -qO- http://127.0.0.1:${WEB_BIND_PORT:-3001}
```

If either fails, the workflow prints `docker compose ps` plus the last API/web logs and marks deploy failed.

The API health response includes safe deploy metadata:

```json
{
  "status": "ok",
  "service": "superflow-api",
  "version": "0.1.0",
  "environment": "production",
  "branch": "main",
  "commit": "abc1234",
  "uptimeSeconds": 123,
  "timestamp": "2026-05-10T00:00:00.000Z"
}
```

## Simple rollback
```bash
cd /home/super-service-app
git checkout <previous-good-commit>
docker compose build api web
docker compose up -d api web
```

After rollback, re-run the smoke checks above.

## GitHub Actions secrets needed
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
