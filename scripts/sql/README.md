# SQL Migration Runbook

This project currently uses manual SQL migrations, not an automatic migration engine.

## Location
Put new production schema changes in this folder:

```text
scripts/sql/YYYY-MM-DD-short-description.sql
```

Older files named `scripts/migration-*.sql` are historical. New migration files should go in `scripts/sql/`.

## Rules
- Every production DB schema change must have a matching SQL file.
- Keep `prisma/schema.prisma` and the SQL migration in sync.
- Never edit an old SQL migration after it has been applied to production. Add a new dated file instead.
- Prefer idempotent SQL where practical, for example `ADD COLUMN IF NOT EXISTS` when supported by the target MariaDB version.
- Review destructive changes manually. Avoid dropping columns/tables until data has been backed up or intentionally archived.

## Apply On VPS
From the VPS project directory:

```bash
cd /home/super-service-app

# Replace the file name with the migration being applied.
docker compose exec -T api sh -lc \
  'cat > /tmp/schema-change.sql && npx prisma@6.6.0 db execute --schema prisma/schema.prisma --file /tmp/schema-change.sql' \
  < scripts/sql/YYYY-MM-DD-short-description.sql
```

This uses the running API container's `DATABASE_URL`, so credentials stay in the VPS `.env`. If the API container is not running, start it first or run the same Prisma command from a temporary Node container with `--env-file .env`.

## Verify
After applying SQL:

```bash
docker compose build api web
docker compose up -d api web
wget -qO- http://127.0.0.1:${API_BIND_PORT:-3000}/health
docker compose logs --tail=80 api
```

Then check the affected screen/API path in the app.

## Tracking
Until a migration tracking table is introduced, record applied production migrations in the deploy notes or release checklist with:

```text
date applied
file name
git commit
operator
result
```
