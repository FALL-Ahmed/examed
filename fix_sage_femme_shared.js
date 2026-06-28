const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function copySubTheme(sourceSubThemeName, sourceThemeName, targetTarget) {
  // Trouver le sous-thème source (INFIRMIER)
  const source = await prisma.subTheme.findFirst({
    where: {
      name: sourceSubThemeName,
      theme: { name: sourceThemeName, target: 'INFIRMIER' },
    },
    include: { questions: true, theme: true },
  });
  if (!source) { console.log(`❌ Source introuvable: ${sourceThemeName} > ${sourceSubThemeName}`); return; }
  console.log(`📋 Source: ${source.questions.length} questions dans ${sourceThemeName} > ${sourceSubThemeName} (INFIRMIER)`);

  // Créer ou récupérer le thème cible
  const targetTheme = await prisma.theme.upsert({
    where: { name_language_target: { name: sourceThemeName, language: 'FR', target: targetTarget } },
    create: { name: sourceThemeName, language: 'FR', target: targetTarget, isPublished: true },
    update: {},
  });

  // Supprimer l'ancien sous-thème s'il existe (pour repartir propre)
  const existing = await prisma.subTheme.findFirst({
    where: { name: sourceSubThemeName, themeId: targetTheme.id },
  });
  if (existing) {
    await prisma.question.deleteMany({ where: { subThemeId: existing.id } });
    await prisma.subTheme.delete({ where: { id: existing.id } });
    console.log(`  🗑 Ancien sous-thème supprimé`);
  }

  // Créer le nouveau sous-thème
  const newSubTheme = await prisma.subTheme.create({
    data: { name: sourceSubThemeName, themeId: targetTheme.id },
  });

  // Copier les questions
  for (let i = 0; i < source.questions.length; i++) {
    const q = source.questions[i];
    await prisma.question.create({
      data: {
        text: q.text,
        choiceA: q.choiceA, choiceB: q.choiceB,
        choiceC: q.choiceC, choiceD: q.choiceD, choiceE: q.choiceE,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        order: q.order || i + 1,
        isActive: q.isActive,
        subThemeId: newSubTheme.id,
      },
    });
  }
  console.log(`  ✓ ${source.questions.length} questions copiées vers ${targetTarget}`);
}

async function main() {
  // 1. Supprimer l'erreur PTME importée depuis le mauvais fichier
  const wrongPtme = await prisma.subTheme.findFirst({
    where: { name: 'PTME DU VIH ET HÉPATITE B', theme: { target: 'SAGE_FEMME' } },
  });
  if (wrongPtme) {
    await prisma.question.deleteMany({ where: { subThemeId: wrongPtme.id } });
    await prisma.subTheme.delete({ where: { id: wrongPtme.id } });
    console.log('🗑 PTME (import incorrect) supprimé');
  }

  // 2. Copier INFECTIONS NÉONATALES BACTÉRIENNES (PEDIATRIE) vers SAGE_FEMME
  await copySubTheme('INFECTIONS NÉONATALES BACTÉRIENNES', 'PEDIATRIE', 'SAGE_FEMME');

  // 3. Copier AELB/AES (VIH) vers SAGE_FEMME
  await copySubTheme('ACCIDENTS D\'EXPOSITION AUX LIQUIDES BIOLOGIQUES (AELB/AES)', 'VIH', 'SAGE_FEMME');

  // Résumé
  console.log('\n=== RÉSUMÉ FINAL ===');
  const themes = await prisma.theme.findMany({
    where: { name: { in: ['PEDIATRIE', 'VIH'] } },
    include: { subThemes: { include: { _count: { select: { questions: true } } } } },
  });
  for (const t of themes) {
    for (const s of t.subThemes) {
      console.log(`${t.target} | ${t.name} | ${s.name} : ${s._count.questions} questions`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
