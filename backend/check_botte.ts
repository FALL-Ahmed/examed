import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const questions = await prisma.question.findMany({
    where: { subTheme: { name: { contains: 'botte', mode: 'insensitive' } } },
    orderBy: { order: 'asc' },
    select: { text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, correctAnswer: true, explanation: true },
  });
  for (const q of questions) {
    console.log('Q:', q.text);
    console.log('A:', q.choiceA);
    console.log('B:', q.choiceB);
    console.log('C:', q.choiceC);
    console.log('D:', q.choiceD);
    console.log('E:', q.choiceE);
    console.log('✓:', q.correctAnswer);
    console.log('Commentaire:', q.explanation);
    console.log('---');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
