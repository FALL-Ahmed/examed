import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const themes = await prisma.theme.findMany({
    where: { target: 'SAGE_FEMME' },
    include: {
      subThemes: {
        include: { _count: { select: { questions: { where: { isActive: true, explanation: { not: '' } } } } } }
      }
    },
    orderBy: { language: 'asc' }
  });

  for (const t of themes) {
    const totalQ = t.subThemes.reduce((s, st) => s + st._count.questions, 0);
    console.log(`[${t.language}] ${t.name} — ${t.subThemes.length} sous-thèmes, ${totalQ} questions`);
    for (const st of t.subThemes) {
      console.log(`   └─ ${st.name} (${st._count.questions} q)`);
    }
  }

  const total = await prisma.question.count({
    where: { isActive: true, explanation: { not: '' }, subTheme: { theme: { target: 'SAGE_FEMME' } } }
  });
  console.log(`\nTotal questions SAGE_FEMME avec explication: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
