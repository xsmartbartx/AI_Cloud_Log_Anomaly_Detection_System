# AI Cloud Log Anomaly Detection System

**Technical Specification & Application Flow Documentation**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Application Flow (End-to-End)](#3-application-flow-end-to-end)
4. [Core Application Modules](#4-core-application-modules)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Storage Strategy](#7-data-storage-strategy)
8. [Security Considerations](#8-security-considerations)
9. [Deployment Model](#9-deployment-model)
10. [Development Roadmap](#10-development-roadmap)
11. [Summary](#11-summary)
12. [Database Schema](#12-database-schema)
13. [Application Folder Structure](#13-application-folder-structure)

**Context file:** [docs/CONTEXT.md](CONTEXT.md) – skrót schematu bazy i struktury aplikacji (dla AI / szybkiego odniesienia).

---

## 1. System Overview

### 1.1 Purpose

Celem systemu jest:

- **Automatyczne wykrywanie anomalii** w logach środowisk cloud
- **Redukcja false positives** względem klasycznych reguł SIEM
- **Wczesne wykrywanie incydentów** (security, performance, infra)
- **Skalowanie** do środowisk multi-cloud

System działa w trybie:

| Tryb   | Opis                          |
|--------|-------------------------------|
| **Streaming** | Near real-time (analiza na bieżąco) |
| **Batch**     | Analiza historyczna           |

---

## 2. High-Level Architecture

```
┌─────────────────┐
│  Log Sources    │  Cloud provider · Kubernetes · Application · Security
└────────┬────────┘
         ▼
┌─────────────────┐
│ Log Ingestion   │  Odbiór, walidacja, kolejkowanie
└────────┬────────┘
         ▼
┌─────────────────┐
│ Streaming /     │  Kafka · Kinesis · PubSub
│ Processing      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Feature         │  Okna czasowe, metryki, embeddingi
│ Engineering     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ AI Model Layer  │  Inference (Isolation Forest, LSTM, Autoencoder…)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Anomaly Scoring │  Score, threshold, confidence
│ Engine          │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Alerting &      │  Policy engine, integracje
│ Automation      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Dashboard / API │  Przeglądanie, API, raporty
└─────────────────┘
```

---

## 3. Application Flow (End-to-End)

### 3.1 Log Ingestion Flow

#### Step 1 – Log Collection

**Źródła:**

- Cloud provider logs
- Kubernetes logs
- Application logs
- Security logs

**Mechanizm:**

- Agent (Fluent Bit / Vector)
- Push do Kafka / Kinesis / PubSub

---

#### Step 2 – Normalization

Każdy log jest przekształcany do **wspólnego schematu**:

```json
{
  "timestamp": "ISO8601",
  "source": "string",
  "service": "string",
  "severity": "string",
  "message": "string",
  "metadata": {}
}
```

**Cel:**

- Ujednolicenie formatów z różnych źródeł
- Eliminacja vendor-lock schematów

---

### 3.2 Processing Flow

#### Step 3 – Parsing & Enrichment

- Parsowanie **structured logs** (JSON)
- **Regex** dla unstructured logs
- **Enrichment:**
  - GeoIP
  - Service mapping
  - Environment tag (prod/dev)

---

### 3.3 Feature Engineering Flow

#### Step 4 – Window Aggregation

Tworzenie **okien czasowych:**

| Okno | Użycie           |
|------|------------------|
| 30 s | Szybkie zdarzenia |
| 1 min| Standard         |
| 5 min| Trendy           |

**Features generowane per okno:**

| Feature           | Opis                    |
|-------------------|-------------------------|
| `event_count`     | Liczba logów w oknie    |
| `error_rate`      | % logów z poziomem error |
| `unique_users`    | Liczba unikalnych userów|
| `ip_entropy`      | Entropia adresów IP     |
| `response_time_avg` | Średni czas odpowiedzi |
| `log_vector`      | Embedding tekstu (NLP)  |

---

### 3.4 Model Flow

#### Step 5 – Feature Vector Creation

Każde okno czasowe → wektor cech:

```
X = [f₁, f₂, f₃, …, fₙ]
```

#### Step 6 – Model Inference

**Obsługiwane typy modeli:**

| Kategoria        | Przykłady                          |
|------------------|------------------------------------|
| **Statistical**  | Isolation Forest, One-Class SVM, LOF |
| **Deep Learning** | LSTM (sekwencje), Autoencoder, Transformer-based encoder |

---

### 3.5 Anomaly Scoring Flow

#### Step 7 – Score Calculation

Model zwraca:

```
anomaly_score ∈ [0, 1]
```

System stosuje **dynamiczny threshold**:

```text
if score > threshold:
    anomaly = True
```

**Threshold:**

- Statyczny (konfigurowalny)
- Adaptacyjny (np. percentyl historyczny)

---

### 3.6 Alerting Flow

#### Step 8 – Alert Decision Engine

Uwzględniane warunki:

- `score > threshold`
- Powtarzalność anomalii w czasie
- Korelacja między usługami

#### Step 9 – Alert Dispatch

**Kanały:**

- Webhook
- Slack
- Email
- REST API

**Przykładowy payload alertu:**

```json
{
  "service": "string",
  "score": 0.92,
  "severity": "high",
  "explanation": "string",
  "timestamp": "ISO8601"
}
```

---

### 3.7 Automation Flow (Optional)

| Typ anomalii   | Akcja przykładowa        |
|----------------|---------------------------|
| **Security**   | Block IP, rotacja credentials |
| **Performance**| Trigger autoscaling, restart pod |

---

## 4. Core Application Modules

### 4.1 Log Ingestion Service

**Odpowiedzialności:**

- Odbiór logów
- Walidacja wejścia
- Wymuszanie schematu
- Publikacja do kolejki

**API:**

| Metoda | Endpoint   | Opis        |
|--------|------------|-------------|
| POST   | `/logs`    | Przyjmowanie logów |
| GET    | `/health`  | Health check       |

---

### 4.2 Processing Engine

**Odpowiedzialności:**

- Parsowanie (structured / unstructured)
- Agregacja w oknach czasowych
- Ekstrakcja cech
- Enrichment danych

---

### 4.3 Feature Engineering Service

**Odpowiedzialności:**

- Generowanie metryk czasowych
- Tworzenie embeddingów (NLP)
- Normalizacja i skalowanie danych

---

### 4.4 AI Model Service

**Odpowiedzialności:**

- Ładowanie modelu
- Inference
- Model versioning
- Monitoring driftu

**API:**

| Metoda | Endpoint           | Opis              |
|--------|--------------------|-------------------|
| POST   | `/predict`         | Inference         |
| GET    | `/model/version`   | Wersja modelu     |

---

### 4.5 Anomaly Scoring Engine

**Odpowiedzialności:**

- Interpretacja wyniku modelu
- Dynamic thresholding
- Confidence scoring

---

### 4.6 Alerting Service

**Odpowiedzialności:**

- Policy engine (reguły alertów)
- Alert deduplication
- Integracje z systemami zewnętrznymi

---

### 4.7 Dashboard / Frontend

**Widoki:**

| Widok            | Zawartość                                              |
|------------------|--------------------------------------------------------|
| **Overview**     | Liczba anomalii, trend dzienny, najbardziej dotknięte usługi |
| **Timeline**     | Interaktywna oś czasu, filtry po severity              |
| **Anomaly Detail** | Score, contributing features, raw logs, SHAP explanation |

---

## 5. Functional Requirements

### 5.1 Must-Have

- Real-time anomaly detection
- Multi-source log ingestion
- Scoring per service
- System alertów
- Dashboard

### 5.2 Should-Have

- Explainability (SHAP)
- Role-based access control (RBAC)
- Architektura multi-tenant
- Feedback loop (tagowanie true/false positive)

### 5.3 Nice-to-Have

- Online learning
- Korelacja cross-service
- Root cause clustering
- LLM-based log summarization

---

## 6. Non-Functional Requirements

| Kategoria     | Wymaganie                  |
|---------------|----------------------------|
| **Scalability**  | > 100k logów/s            |
| **Latency**      | < 2 s (inference)         |
| **Availability** | 99.9%                     |
| **Security**     | TLS + JWT                 |
| **Observability**| Metrics + tracing         |

---

## 7. Data Storage Strategy

| Warstwa     | Technologia           | Retention   |
|-------------|------------------------|-------------|
| **Hot**     | Elasticsearch / OpenSearch | 7–30 dni   |
| **Cold**    | Object storage        | Długoterminowa archiwizacja |

---

## 8. Security Considerations

- **TLS everywhere** – szyfrowanie w tranzycie
- **API authentication** – JWT / OAuth
- **Log data encryption at rest**
- **Role-based access**
- **Audit logs** – rejestracja dostępu i zmian

---

## 9. Deployment Model

| Opcja | Opis |
|-------|------|
| **A – Kubernetes-native** | Microservices, horizontal autoscaling |
| **B – SaaS** | Multi-tenant, izolowane namespace’y, billing per ingestion volume |

---

## 10. Development Roadmap

### Phase 1 – MVP

- Log ingestion
- Model: Isolation Forest
- Basic dashboard
- Alerting

### Phase 2 – Advanced

- Model deep learning
- SHAP explanations
- Feedback loop

### Phase 3 – Enterprise

- Multi-cloud correlation
- Automation engine
- SaaS readiness

---

## 11. Summary

System ma:

- **Wykrywać anomalie**, a nie tylko błędy
- Być **skalowalny** i **model-agnostyczny**
- Umożliwiać rozwój w kierunku: security + performance + compliance
- Zapewniać **explainability** (kluczowe dla SOC / SRE)

> **To nie jest monitoring.**  
> To jest **predykcyjny system detekcji incydentów** oparty o AI.

---

## 12. Database Schema

Relational store (PostgreSQL) dla metadanych, konfiguracji, anomalii i alertów. Logi gorące pozostają w Elasticsearch/OpenSearch (patrz [7. Data Storage Strategy](#7-data-storage-strategy)).

### 12.1 Entity Relationship Overview

```
tenants ──┬── users ── user_roles ── roles
          ├── services ── log_sources
          ├── feature_windows ── anomalies
          ├── alert_policies ── alerts
          ├── model_versions
          ├── feedback
          ├── integrations
          └── audit_logs
```

### 12.2 Table Definitions (PostgreSQL)

#### Multi-tenant & RBAC

```sql
-- Tenants (SaaS / multi-tenant)
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(64) UNIQUE NOT NULL,
  config            JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(64) NOT NULL,
  permissions       JSONB DEFAULT '[]',
  UNIQUE(tenant_id, name)
);

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255),
  name              VARCHAR(255),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE user_roles (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id           UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

#### Services & Log Sources

```sql
CREATE TABLE services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(64) NOT NULL,
  environment       VARCHAR(32),
  config            JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE TABLE log_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id        UUID REFERENCES services(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  source_type       VARCHAR(64) NOT NULL,
  connection_config JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Models (before anomalies – FK reference)

```sql
CREATE TABLE model_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(128) NOT NULL,
  version           VARCHAR(64) NOT NULL,
  model_type        VARCHAR(64) NOT NULL,
  artifact_path     VARCHAR(512),
  config            JSONB DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name, version)
);
```

#### Feature Windows & Anomalies

```sql
CREATE TABLE feature_windows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id        UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  window_start      TIMESTAMPTZ NOT NULL,
  window_end        TIMESTAMPTZ NOT NULL,
  window_seconds    INT NOT NULL,
  event_count       BIGINT NOT NULL DEFAULT 0,
  error_rate        DECIMAL(5,4) NOT NULL DEFAULT 0,
  unique_users      INT NOT NULL DEFAULT 0,
  ip_entropy        DECIMAL(10,6),
  response_time_avg DECIMAL(12,4),
  feature_vector    JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, service_id, window_start, window_seconds)
);

CREATE INDEX idx_feature_windows_service_time ON feature_windows(tenant_id, service_id, window_start);

CREATE TABLE anomalies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id        UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  feature_window_id UUID REFERENCES feature_windows(id) ON DELETE SET NULL,
  model_version_id  UUID REFERENCES model_versions(id) ON DELETE SET NULL,
  score             DECIMAL(5,4) NOT NULL,
  severity          VARCHAR(32) NOT NULL,
  anomaly_type      VARCHAR(32),
  explanation       TEXT,
  shap_values       JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anomalies_tenant_service_time ON anomalies(tenant_id, service_id, created_at);
```

#### Alerting

```sql
CREATE TABLE alert_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  conditions        JSONB NOT NULL,
  severity_mapping  JSONB DEFAULT '{}',
  cooldown_seconds  INT NOT NULL DEFAULT 300,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  anomaly_id        UUID REFERENCES anomalies(id) ON DELETE SET NULL,
  policy_id         UUID REFERENCES alert_policies(id) ON DELETE SET NULL,
  severity          VARCHAR(32) NOT NULL,
  channel           VARCHAR(64) NOT NULL,
  payload           JSONB NOT NULL,
  status            VARCHAR(32) NOT NULL DEFAULT 'sent',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type              VARCHAR(64) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  config            JSONB NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Feedback & Audit

```sql
CREATE TABLE feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  anomaly_id        UUID NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  is_true_positive  BOOLEAN NOT NULL,
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  action            VARCHAR(64) NOT NULL,
  resource_type     VARCHAR(64),
  resource_id       UUID,
  details           JSONB,
  ip_address        INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, created_at);
```

### 12.3 Elasticsearch / OpenSearch Index (Hot Log Storage)

Logi znormalizowane (gorące) – sugerowany mapping:

```json
{
  "mappings": {
    "properties": {
      "timestamp":   { "type": "date" },
      "tenant_id":   { "type": "keyword" },
      "source":      { "type": "keyword" },
      "service_id":  { "type": "keyword" },
      "service":     { "type": "keyword" },
      "severity":    { "type": "keyword" },
      "message":     { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "metadata":    { "type": "object", "enabled": true },
      "ingested_at": { "type": "date" }
    }
  }
}
```

Index naming: `logs-{tenant_slug}-{YYYY.MM.DD}` (lub alias + rollover).

---

## 13. Application Folder Structure

Rekomendowana struktura repozytorium (monorepo, gotowa do podziału na microservices).

```
AI_Cloud_Log_Anomaly_Detection_System/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── apps/
│   ├── api-gateway/                 # BFF / API Gateway
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── log-ingestion/               # Log Ingestion Service (POST /logs)
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── validation/
│   │   │   ├── publishers/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── processing-engine/          # Parsing, enrichment, windowing
│   │   ├── src/
│   │   │   ├── consumers/
│   │   │   ├── parsers/
│   │   │   ├── aggregators/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── feature-engineering/        # Feature extraction, embeddings
│   │   ├── src/
│   │   │   ├── consumers/
│   │   │   ├── features/
│   │   │   ├── embeddings/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── model-service/              # AI Model inference (POST /predict)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── inference/
│   │   │   ├── models/
│   │   │   └── index.ts
│   │   ├── models/                 # Artifact storage (or S3 refs)
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── scoring-engine/            # Anomaly scoring, thresholding
│   │   ├── src/
│   │   │   ├── consumers/
│   │   │   ├── scoring/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── alerting-service/           # Policy engine, dispatch
│   │   ├── src/
│   │   │   ├── consumers/
│   │   │   ├── policies/
│   │   │   ├── channels/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   └── dashboard/                  # Frontend (React/Vue/etc.)
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── api/
│       │   └── index.tsx
│       ├── package.json
│       └── Dockerfile
├── packages/
│   ├── shared-types/               # TS types, DTOs, enums
│   │   ├── src/
│   │   │   ├── log.ts
│   │   │   ├── anomaly.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── db-client/                  # DB access, migrations
│   │   ├── src/
│   │   │   ├── migrations/
│   │   │   ├── repositories/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── messaging/                 # Kafka/RabbitMQ producers/consumers
│   │   ├── src/
│   │   │   ├── producers.ts
│   │   │   ├── consumers.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── config/                    # Shared config, env schema
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── deploy/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── k8s/
│       ├── base/
│       └── overlays/
│           ├── dev/
│           └── prod/
├── docs/
│   ├── SPECIFICATION.md
│   └── CONTEXT.md
├── scripts/
│   ├── migrate.sh
│   ├── seed-dev.sh
│   └── run-local.sh
├── package.json                   # Workspace root (pnpm/npm/yarn)
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

### 13.1 Mapping to Specification Modules

| Spec module (Section 4)     | App path                    |
|-----------------------------|-----------------------------|
| 4.1 Log Ingestion Service   | `apps/log-ingestion`        |
| 4.2 Processing Engine       | `apps/processing-engine`    |
| 4.3 Feature Engineering     | `apps/feature-engineering`  |
| 4.4 AI Model Service        | `apps/model-service`        |
| 4.5 Anomaly Scoring Engine  | `apps/scoring-engine`       |
| 4.6 Alerting Service       | `apps/alerting-service`    |
| 4.7 Dashboard / Frontend    | `apps/dashboard`            |
| API / Gateway               | `apps/api-gateway`          |

---

*Dokument przygotowany dla zespołu developerskiego. Wersja: 1.1.*
