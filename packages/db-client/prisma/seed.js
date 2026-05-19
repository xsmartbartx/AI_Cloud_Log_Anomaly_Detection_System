const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slug = 'dev';
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log('Dev tenant already exists:', existing.id);
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Dev Tenant',
      slug,
    },
  });

  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'admin',
      permissions: [],
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@local',
      passwordHash: 'dev',
      name: 'Admin',
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  await prisma.service.create({
    data: {
      tenantId: tenant.id,
      name: 'web',
      slug: 'web',
    },
  });

  console.log('Seeded dev tenant:', tenant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
