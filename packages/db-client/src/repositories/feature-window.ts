import { prisma } from '../client.js';

export async function upsertFeatureWindow(data: {
  tenantId: string;
  serviceId: string;
  windowStart: Date;
  windowEnd: Date;
  windowSeconds: number;
  eventCount: number;
  errorRate: number;
  uniqueUsers: number;
  ipEntropy?: number;
  responseTimeAvg?: number;
  featureVector?: number[] | object;
}) {
  const createPayload = {
    tenant: { connect: { id: data.tenantId } },
    service: { connect: { id: data.serviceId } },
    windowStart: data.windowStart,
    windowEnd: data.windowEnd,
    windowSeconds: data.windowSeconds,
    eventCount: data.eventCount,
    errorRate: data.errorRate,
    uniqueUsers: data.uniqueUsers,
    ipEntropy: data.ipEntropy,
    responseTimeAvg: data.responseTimeAvg,
    featureVector: data.featureVector ? (data.featureVector as object) : undefined,
  };

  return prisma.featureWindow.upsert({
    where: {
      tenantId_serviceId_windowStart_windowSeconds: {
        tenantId: data.tenantId,
        serviceId: data.serviceId,
        windowStart: data.windowStart,
        windowSeconds: data.windowSeconds,
      },
    },
    create: createPayload,
    update: {
      windowEnd: data.windowEnd,
      eventCount: data.eventCount,
      errorRate: data.errorRate,
      uniqueUsers: data.uniqueUsers,
      ipEntropy: data.ipEntropy ?? undefined,
      responseTimeAvg: data.responseTimeAvg ?? undefined,
      featureVector: data.featureVector ? (data.featureVector as object) : undefined,
    },
  });
}
