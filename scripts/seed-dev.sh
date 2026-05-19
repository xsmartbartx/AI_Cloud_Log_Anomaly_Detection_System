#!/usr/bin/env bash
set -euo pipefail

# Navigate to repo root
cd "$(dirname "$0")/.."

echo "Running dev migrations..."
npm run db:migrate:dev

echo "Generating Prisma client..."
npm run db:generate

echo "Running seed script..."
npm run db:seed

echo "Seed complete."
