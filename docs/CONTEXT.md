# Project Context – AI Cloud Log Anomaly Detection System

Szybki kontekst dla zespołu i narzędzi: schemat bazy danych oraz struktura aplikacji. Pełna specyfikacja: [SPECIFICATION.md](./SPECIFICATION.md).

---

## 1. Database Schema (Summary)

**Relational (PostgreSQL):** metadane, konfiguracja, anomalie, alerty, RBAC, feedback, audit.  
**Hot logs:** Elasticsearch/OpenSearch (indeksy czasowe, retention 7–30 dni).

### Tables (creation order for FK)

| # | Table | Purpose |
|---|--------|--------|
| 1 | `tenants` | Multi-tenant; config, slug |
| 2 | `roles` | Per-tenant roles, permissions JSONB |
| 3 | `users` | Per-tenant; email, password_hash, is_active |
| 4 | `user_roles` | user_id, role_id |
| 5 | `services` | Per-tenant; name, slug, environment |
| 6 | `log_sources` | Per-tenant; source_type, connection_config |
| 7 | `model_versions` | Per-tenant; name, version, model_type, artifact_path, is_active |
| 8 | `feature_windows` | Aggregated features per (tenant, service, window_start, window_seconds) |
| 9 | `anomalies` | score, severity, anomaly_type, explanation, shap_values; FK → feature_windows, model_versions |
| 10 | `alert_policies` | conditions JSONB, severity_mapping, cooldown_seconds |
| 11 | `alerts` | anomaly_id, policy_id, channel, payload, status, sent_at |
| 12 | `integrations` | type, name, config (webhook, slack, email) |
| 13 | `feedback` | anomaly_id, is_true_positive, comment |
| 14 | `audit_logs` | user_id, action, resource_type, resource_id, details |

### Key indexes

- `feature_windows(tenant_id, service_id, window_start)`
- `anomalies(tenant_id, service_id, created_at)`
- `audit_logs(tenant_id, created_at)`

### ES/OpenSearch log index

- Fields: `timestamp`, `tenant_id`, `source`, `service_id`, `service`, `severity`, `message`, `metadata`, `ingested_at`
- Naming: `logs-{tenant_slug}-{YYYY.MM.DD}` (lub alias + rollover)

---

## 2. Application Folder Structure

```
AI_Cloud_Log_Anomaly_Detection_System/
├── .github/workflows/          # CI, deploy
├── apps/
│   ├── api-gateway/            # BFF / API Gateway
│   ├── log-ingestion/          # POST /logs, validation, publish
│   ├── processing-engine/      # Parse, enrich, window aggregation
│   ├── feature-engineering/    # Features, embeddings
│   ├── model-service/          # POST /predict, model versioning
│   ├── scoring-engine/        # Anomaly score, thresholding
│   ├── alerting-service/       # Policies, channels, dispatch
│   └── dashboard/              # Frontend (Overview, Timeline, Anomaly Detail)
├── packages/
│   ├── shared-types/           # DTOs, enums, log/anomaly types
│   ├── db-client/              # Migrations, repositories
│   ├── messaging/              # Kafka/RabbitMQ producers-consumers
│   └── config/                 # Env, shared config
├── deploy/
│   ├── docker-compose.yml
│   └── k8s/base + overlays (dev, prod)
├── docs/
│   ├── SPECIFICATION.md        # Full spec
│   └── CONTEXT.md              # This file
├── scripts/                    # migrate, seed-dev, run-local
├── package.json                # Workspace root
└── pnpm-workspace.yaml
```

### Spec → folder mapping

| Spec module | Path |
|-------------|------|
| Log Ingestion Service | `apps/log-ingestion` |
| Processing Engine | `apps/processing-engine` |
| Feature Engineering Service | `apps/feature-engineering` |
| AI Model Service | `apps/model-service` |
| Anomaly Scoring Engine | `apps/scoring-engine` |
| Alerting Service | `apps/alerting-service` |
| Dashboard / Frontend | `apps/dashboard` |
| API / Gateway | `apps/api-gateway` |

---

*Context file – wersja 1.0. Szczegóły SQL i drzewo katalogów: SPECIFICATION.md §12 i §13.*
