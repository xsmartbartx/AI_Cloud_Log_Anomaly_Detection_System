/**
 * Normalized log schema (SPECIFICATION §3.1 Step 2).
 */
export interface NormalizedLog {
  timestamp: string; // ISO8601
  source: string;
  service: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown>;
}

/**
 * Ingest payload: single log or batch.
 */
export interface IngestLogPayload {
  timestamp: string;
  source: string;
  service: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const LOG_SEVERITIES = ['debug', 'info', 'warn', 'error'] as const;
export type LogSeverity = (typeof LOG_SEVERITIES)[number];
