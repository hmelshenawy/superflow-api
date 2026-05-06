#!/bin/bash
# Multi-Tenant Migration & Deployment Script
# Run on VPS (root@145.223.74.13) from /root/superflow
#
# This script handles the multi-tenant migration in the correct order:
# 1. Push schema changes (nullable workshop_id columns)
# 2. Seed workshop data and backfill
# 3. Push schema again (NOT NULL + composite uniques)
# 4. Rebuild Docker containers

set -e

COMPOSE="docker compose"
API_CONTAINER="superflow-api"

echo "=== Multi-Tenant Migration ==="

# Step 1: Generate Prisma client and push schema (creates tables + nullable columns)
echo ""
echo "Step 1: Pushing schema changes (Phase 1 - nullable columns)..."
$COMPOSE exec $API_CONTAINER npx prisma db push --accept-data-loss 2>/dev/null || {
  echo "Container not running, trying direct push..."
  docker run --rm --network superflow_internal -e DATABASE_URL="$DATABASE_URL" \
    -v "$(pwd)/prisma:/app/prisma" -w /app \
    node:20-alpine sh -c "npm i @prisma/client prisma && npx prisma db push --accept-data-loss"
}

# Step 2: Seed workshop data
echo ""
echo "Step 2: Seeding workshop data and backfilling..."
$COMPOSE exec $API_CONTAINER npx ts-node scripts/seed-workshop.ts 2>/dev/null || {
  echo "Running seed via docker run..."
  docker run --rm --network mariadb-bzki_default -e DATABASE_URL="$DATABASE_URL" \
    -v "$(pwd):/app" -w /app \
    node:20-alpine sh -c "npm ci && npx ts-node scripts/seed-workshop.ts"
}

# Step 3: Seed roles (includes platform_admin)
echo ""
echo "Step 3: Seeding roles (includes platform_admin)..."
$COMPOSE exec $API_CONTAINER npx ts-node scripts/seed-roles.ts 2>/dev/null || {
  echo "Running role seed via docker run..."
  docker run --rm --network mariadb-bzki_default -e DATABASE_URL="$DATABASE_URL" \
    -v "$(pwd):/app" -w /app \
    node:20-alpine sh -c "npm ci && npx ts-node scripts/seed-roles.ts"
}

# Step 4: Make workshop_id NOT NULL + add composite unique constraints
# NOTE: This step locks tables briefly. Run during low-traffic period.
echo ""
echo "Step 4: Making workshop_id NOT NULL and adding composite unique constraints..."
echo "This requires a separate migration SQL to run directly."

# Step 5: Rebuild and deploy
echo ""
echo "Step 5: Rebuilding Docker containers..."
$COMPOSE build api
$COMPOSE up -d api

echo ""
echo "=== Migration Complete ==="
echo "Verify: docker compose exec superflow-api wget -qO- http://127.0.0.1:3000/health"