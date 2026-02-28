import { prisma } from '../client.js';

export async function createTenant(data: { name: string; slug: string; config?: object }) {
  return prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      config: (data.config ?? {}) as object,
    },
  });
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getTenantById(id: string) {
  return prisma.tenant.findUnique({ where: { id } });
}
