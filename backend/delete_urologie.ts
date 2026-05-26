import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const themes = await prisma.theme.findMany({
    where: { name: { contains: 'urologie', mode: 'insensitive' } },
    include: {
      _count: { select: { subThemes: true } },
      subThemes: { include: { _count: { select: { questions: true } } } },
    },
  });

  if (!themes.length) { console.log('Aucun thème urologie trouvé'); return; }

  for (const theme of themes) {
    const totalQ = theme.subThemes.reduce((s, st) => s + st._count.questions, 0);
    console.log(`Trouvé: "${theme.name}" [${theme.language}] — ${theme._count.subThemes} sous-thèmes, ${totalQ} questions`);

    // Supprimer les réponses utilisateurs liées aux questions de ce thème
    const subThemeIds = theme.subThemes.map(st => st.id);
    const questions = await prisma.question.findMany({
      where: { subThemeId: { in: subThemeIds } },
      select: { id: true },
    });
    const questionIds = questions.map(q => q.id);

    if (questionIds.length) {
      const delAnswers = await prisma.userAnswer.deleteMany({ where: { questionId: { in: questionIds } } });
      console.log(`  → ${delAnswers.count} réponses supprimées`);
      const delQ = await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
      console.log(`  → ${delQ.count} questions supprimées`);
    }

    await prisma.subTheme.deleteMany({ where: { themeId: theme.id } });
    console.log(`  → Sous-thèmes supprimés`);

    await prisma.theme.delete({ where: { id: theme.id } });
    console.log(`  ✅ Thème "${theme.name}" supprimé définitivement`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
