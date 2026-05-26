import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const q1 = await prisma.question.findFirst({
    where: { text: { contains: 'objectifs et les indications de cette technique' } },
  });
  if (!q1) { console.log('Question non trouvée'); return; }

  await prisma.question.update({
    where: { id: q1.id },
    data: { correctAnswer: 'B,C' },
  });

  console.log('Corrigé ✓ — correctAnswer: B,C');
}

main().catch(console.error).finally(() => prisma.$disconnect());
