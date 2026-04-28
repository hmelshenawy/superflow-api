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

## GitHub Actions secrets needed
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
