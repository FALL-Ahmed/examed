import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@ExaMed2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@examed.mr' },
    update: {},
    create: {
      email: 'admin@examed.mr',
      passwordHash: hash,
      fullName: 'Administrateur ExaMed',
      role: 'ADMIN',
    },
  });

  console.log('Admin créé:', admin.email);
  console.log('Mot de passe: Admin@ExaMed2024!');
  console.log('⚠️  Changez ce mot de passe en production !');
}

main().catch(console.error).finally(() => prisma.$disconnect());
