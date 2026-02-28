import { prisma } from '../client.js';

export async function getServiceBySlug(tenantId: string, slug: string) {
  return prisma.service.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
}

export async function createService(data: {
  tenantId: string;
  name: string;
  slug: string;
  environment?: string;
  config?: object;
}) {
  return prisma.service.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug,
      environment: data.environment ?? null,
      config: (data.config ?? {}) as object,
    },
  });
}

export async function findOrCreateService(tenantId: string, slug: string, name?: string) {
  const existing = await getServiceBySlug(tenantId, slug);
  if (existing) return existing;
  return createService({
    tenantId,
    name: name ?? slug,
    slug,
  });
}
