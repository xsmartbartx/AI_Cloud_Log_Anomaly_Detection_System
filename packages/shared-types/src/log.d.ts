/**
 * Normalized log schema (SPECIFICATION §3.1 Step 2).
 */
export interface NormalizedLog {
    timestamp: string;
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
export declare const LOG_SEVERITIES: readonly ["debug", "info", "warn", "error"];
export type LogSeverity = (typeof LOG_SEVERITIES)[number];
//# sourceMappingURL=log.d.ts.map