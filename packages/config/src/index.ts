/**
 * Shared config: env-based settings.
 * Expand with zod or similar for validation.
 */
function env(key: string, defaultValue?: string): string {
  const v = process.env[key] ?? defaultValue;
  if (v === undefined) throw new Error(`Missing env: ${key}`);
  return v;
}

function envNumber(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Invalid number for env: ${key}`);
  return n;
}

export const config = {
  database: {
    url: () => env('DATABASE_URL', 'postgresql://localhost:5432/anomaly_detection'),
  },
  ingestion: {
    port: () => envNumber('INGESTION_PORT', 3001),
  },
  modelService: {
    port: () => envNumber('MODEL_SERVICE_PORT', 3002),
    artifactPath: () => env('MODEL_ARTIFACT_PATH', './models'),
  },
  apiGateway: {
    port: () => envNumber('API_GATEWAY_PORT', 3000),
  },
  redis: {
    url: () => process.env['REDIS_URL'] ?? null,
  },
  kafka: {
    brokers: () => (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
  },
} as const;
