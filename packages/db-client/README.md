# @anomaly/db-client

PostgreSQL client and repositories for the AI Cloud Log Anomaly Detection System (Prisma, schema per SPECIFICATION §12).

## Setup

1. Copy env from repo root: ensure `DATABASE_URL` is set (e.g. in `.env` at repo root or in this package).
2. Generate Prisma client and run migrations:

```bash
cd packages/db-client
npm run db:generate
npm run db:migrate
```

For development with interactive migrations:

```bash
npm run db:migrate:dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Apply migrations (deploy) |
| `npm run db:migrate:dev` | Create/apply migrations (dev) |
| `npm run db:push` | Push schema without migration files |
| `npm run db:studio` | Open Prisma Studio |

## Usage

```ts
import { prisma, createTenant, getServiceBySlug, upsertFeatureWindow, insertAnomaly } from '@anomaly/db-client';

// Raw Prisma
const tenants = await prisma.tenant.findMany();

// Repositories
const tenant = await createTenant({ name: 'Acme', slug: 'acme' });
const service = await getServiceBySlug(tenant.id, 'api-gateway');
await upsertFeatureWindow({ tenantId, serviceId, windowStart, windowEnd, windowSeconds, eventCount, errorRate, uniqueUsers });
await insertAnomaly({ tenantId, serviceId, score: 0.95, severity: 'high' });
```

## Tables (snake_case in DB)

tenants, roles, users, user_roles, services, log_sources, model_versions, feature_windows, anomalies, alert_policies, alerts, integrations, feedback, audit_logs
