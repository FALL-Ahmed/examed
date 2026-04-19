const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@SmartQCM2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartqcm.mr' },
    update: {},
    create: {
      email: 'admin@smartqcm.mr',
      passwordHash: hash,
      fullName: 'Administrateur SmartQCM',
      role: 'ADMIN',
    },
  });

  console.log('Admin créé:', admin.email);

  await prisma.setting.upsert({
    where: { key: 'PREMIUM_PRICE' },
    update: {},
    create: { key: 'PREMIUM_PRICE', value: '500' },
  });

  console.log('Paramètre prix initialisé : 500 MRU');
}

main().catch(console.error).finally(() => prisma.$disconnect());
