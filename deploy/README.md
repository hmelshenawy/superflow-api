# Production Deploy Notes

## What was added
- `docker-compose.yml` for `api`, `web`, and `redis`
- Traefik labels on `api` and `web`
- `superflow-web/Dockerfile`
- `.env.production.example`
- `.github/workflows/deploy.yml`

## Reverse proxy model
This VPS already runs **Traefik** on the external `n8n_default` Docker network.

This stack is now adapted to that setup on a **single domain**:
- `https://$APP_DOMAIN` -> `web`
- `https://$APP_DOMAIN/api` -> `api`
- `https://$APP_DOMAIN/portal` -> `api` customer-portal endpoints

## Safe deploy
```bash
cp .env.production.example .env.production
# edit with real domain + secrets

docker compose --env-file .env.production build api web
docker compose --env-file .env.production up -d redis api web
```

## GitHub Actions secrets needed
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
