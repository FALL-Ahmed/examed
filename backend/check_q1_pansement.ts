import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const q = await prisma.question.findFirst({
    where: { text: { contains: 'plusieurs plaies, quelles règles de base' } },
  });
  if (!q) { console.log('Non trouvée'); return; }
  console.log('text:', q.text);
  console.log('choiceA:', q.choiceA);
  console.log('choiceB:', q.choiceB);
  console.log('choiceC:', q.choiceC);
  console.log('choiceD:', q.choiceD);
  console.log('choiceE:', q.choiceE);
  console.log('correctAnswer:', q.correctAnswer);
  console.log('explanation:', q.explanation);
}

main().catch(console.error).finally(() => prisma.$disconnect());
