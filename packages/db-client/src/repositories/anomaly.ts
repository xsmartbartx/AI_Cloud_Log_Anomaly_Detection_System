import { prisma } from '../client.js';

export async function insertAnomaly(data: {
  tenantId: string;
  serviceId: string;
  featureWindowId?: string;
  modelVersionId?: string;
  score: number;
  severity: string;
  anomalyType?: string;
  explanation?: string;
  shapValues?: object;
}) {
  return prisma.anomaly.create({
    data: {
      tenantId: data.tenantId,
      serviceId: data.serviceId,
      featureWindowId: data.featureWindowId ?? null,
      modelVersionId: data.modelVersionId ?? null,
      score: data.score,
      severity: data.severity,
      anomalyType: data.anomalyType ?? null,
      explanation: data.explanation ?? null,
      shapValues: data.shapValues ? (data.shapValues as object) : null,
    },
  });
}

export async function getAnomaliesByService(
  tenantId: string,
  serviceId: string,
  options?: { from?: Date; to?: Date; limit?: number }
) {
  const { from, to, limit = 100 } = options ?? {};
  return prisma.anomaly.findMany({
    where: {
      tenantId,
      serviceId,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
