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

export const ANOMALY_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];
