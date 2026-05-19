#!/usr/bin/env bash
set -euo pipefail

# Navigate to repo root
cd "$(dirname "$0")/.."

echo "Applying DB migrations (deploy)..."
npm run db:migrate

echo "Generating Prisma client..."
npm run db:generate

echo "Seeding dev data..."
npm run db:seed

echo "Starting workspace dev servers..."
npm run dev
