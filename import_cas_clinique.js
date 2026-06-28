const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const questions = require('C:/Users/PC/Telechargement/cas_parsed.json');
const prisma = new PrismaClient();

async function main() {
  // 1. Créer ou récupérer le thème CAS CLINIQUE
  let theme = await prisma.theme.findFirst({
    where: { name: 'CAS CLINIQUE', language: 'FR', target: 'INFIRMIER' },
  });
  if (!theme) {
    theme = await prisma.theme.create({
      data: { name: 'CAS CLINIQUE', language: 'FR', target: 'INFIRMIER' },
    });
    console.log('✅ Thème créé:', theme.id);
  } else {
    console.log('ℹ️  Thème existant:', theme.id);
  }

  // 2. Créer ou récupérer le sous-thème CAS CLINIQUE
  let subTheme = await prisma.subTheme.findFirst({
    where: { name: 'CAS CLINIQUE', themeId: theme.id },
  });
  if (!subTheme) {
    subTheme = await prisma.subTheme.create({
      data: { name: 'CAS CLINIQUE', themeId: theme.id },
    });
    console.log('✅ Sous-thème créé:', subTheme.id);
  } else {
    console.log('ℹ️  Sous-thème existant:', subTheme.id);
  }

  // 3. Importer les questions
  let imported = 0, skipped = 0;
  for (const q of questions) {
    const existing = await prisma.question.findFirst({
      where: { text: q.text, subThemeId: subTheme.id },
    });
    if (existing) { skipped++; continue; }

    await prisma.question.create({
      data: {
        text: q.text,
        choiceA: q.choices.A || '',
        choiceB: q.choices.B || '',
        choiceC: q.choices.C || '',
        choiceD: q.choices.D || '',
        choiceE: q.choices.E || '',
        correctAnswer: q.correct,
        explanation: q.comment || '',
        isActive: true,
        subThemeId: subTheme.id,
      },
    });
    imported++;
  }

  console.log('\n=== RÉSULTAT ===');
  console.log('Importées :', imported);
  console.log('Skippées  :', skipped);
  console.log('Total     :', questions.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
