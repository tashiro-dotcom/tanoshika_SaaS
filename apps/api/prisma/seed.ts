import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const organizationId = 'org-1';
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin123!';
  const adminMfaSecret = 'JBSWY3DPEHPK3PXP';

  const existingAdmin = await prisma.staffUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.staffUser.create({
      data: {
        organizationId,
        email: adminEmail,
        name: 'Default Admin',
        role: 'admin',
        passwordHash: await hash(adminPassword, 10),
        mfaEnabled: true,
        mfaSecret: adminMfaSecret,
      },
    });
  }

  const serviceUser = await prisma.serviceUser.findFirst({ where: { organizationId, fullName: 'テスト利用者' } });
  if (!serviceUser) {
    const created = await prisma.serviceUser.create({
      data: {
        organizationId,
        fullName: 'テスト利用者',
        status: 'active',
        statusHistory: {
          create: {
            organizationId,
            status: 'active',
          },
        },
      },
    });

    await prisma.wageRate.create({
      data: {
        organizationId,
        serviceUserId: created.id,
        hourlyRate: 1000,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
