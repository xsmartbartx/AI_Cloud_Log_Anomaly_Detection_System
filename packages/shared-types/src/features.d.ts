/**
 * Feature window schema (SPECIFICATION §3.3 Step 4).
 */
export interface FeatureWindow {
    tenantId: string;
    serviceId: string;
    windowStart: string;
    windowEnd: string;
    windowSeconds: number;
    eventCount: number;
    errorRate: number;
    uniqueUsers: number;
    ipEntropy?: number;
    responseTimeAvg?: number;
    featureVector?: number[];
    logVector?: number[];
}
export type FeatureVector = number[];
//# sourceMappingURL=features.d.ts.map