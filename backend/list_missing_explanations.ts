import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    where: { explanation: '', isActive: true, subTheme: { theme: { language: 'FR' } } },
    select: {
      text: true,
      choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true,
      correctAnswer: true,
      subTheme: { select: { name: true, theme: { select: { name: true } } } },
    },
    orderBy: [{ subTheme: { theme: { name: 'asc' } } }, { subTheme: { name: 'asc' } }, { order: 'asc' }],
  });

  let currentTheme = '';
  for (const q of questions) {
    const key = `${q.subTheme.theme.name} > ${q.subTheme.name}`;
    if (key !== currentTheme) {
      console.log(`\n=== ${key} ===`);
      currentTheme = key;
    }
    console.log(`Q: ${q.text}`);
    console.log(`  A: ${q.choiceA}`);
    console.log(`  B: ${q.choiceB}`);
    console.log(`  C: ${q.choiceC}`);
    console.log(`  D: ${q.choiceD}`);
    if (q.choiceE) console.log(`  E: ${q.choiceE}`);
    console.log(`  ✓ ${q.correctAnswer}`);
    console.log();
  }
  console.log(`Total: ${questions.length} questions`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
