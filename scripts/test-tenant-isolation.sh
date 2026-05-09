#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env" >&2
  exit 1
fi

# The app containers use docker DNS hostname 'mariadb'.
# Host-side tests need 127.0.0.1 because MariaDB publishes port 3306.
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/@mariadb:/@127.0.0.1:/')"

npx ts-node -r tsconfig-paths/register test/tenant-isolation.ts
