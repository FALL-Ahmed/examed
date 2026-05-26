import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Vérifier version AR encore présente
  const ar = await prisma.theme.findMany({
    where: { name: { contains: 'neurologie', mode: 'insensitive' } },
    include: { subThemes: { include: { questions: true } } },
  });
  console.log('Thèmes neurologie restants:', JSON.stringify(ar, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
