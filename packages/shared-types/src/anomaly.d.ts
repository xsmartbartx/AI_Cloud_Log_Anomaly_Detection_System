/**
 * Anomaly and alert DTOs (SPECIFICATION §3.5, §3.6).
 */
export interface AnomalyRecord {
    id: string;
    tenantId: string;
    serviceId: string;
    featureWindowId?: string;
    modelVersionId?: string;
    score: number;
    severity: string;
    anomalyType?: string;
    explanation?: string;
    shapValues?: Record<string, number>;
    createdAt: string;
}
export interface AlertPayload {
    service: string;
    score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    explanation?: string;
    timestamp: string;
}
export declare const ANOMALY_SEVERITIES: readonly ["low", "medium", "high", "critical"];
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];
//# sourceMappingURL=anomaly.d.ts.map