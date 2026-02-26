/**
 * Feature window schema (SPECIFICATION §3.3 Step 4).
 */
export interface FeatureWindow {
  tenantId: string;
  serviceId: string;
  windowStart: string; // ISO8601
  windowEnd: string;
  windowSeconds: number;
  eventCount: number;
  errorRate: number;
  uniqueUsers: number;
  ipEntropy?: number;
  responseTimeAvg?: number;
  featureVector?: number[];
  logVector?: number[]; // embedding
}

export type FeatureVector = number[];
