import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Sous-thèmes à exclure de PRATIQUE pour SAGE_FEMME
const EXCLUDED_PRATIQUE = [
  'brachio', 'manchette', 'mayo', 'oxyg', 'immobili', 'escarre', 'lavement', 'botte'
];

function isExcluded(name: string): boolean {
  const n = name.toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a');
  return EXCLUDED_PRATIQUE.some(k => n.includes(k));
}

async function copyThemeToSF(sourceThemeId: string, excludeSubThemes = false) {
  const source = await prisma.theme.findUnique({
    where: { id: sourceThemeId },
    include: {
      subThemes: {
        include: {
          questions: { where: { isActive: true } }
        }
      }
    }
  });
  if (!source) return;

  // Supprimer l'ancienne copie SF si elle existe
  await prisma.theme.deleteMany({
    where: { name: source.name, language: source.language, target: 'SAGE_FEMME' }
  });

  const subThemesToCopy = excludeSubThemes
    ? source.subThemes.filter(st => !isExcluded(st.name))
    : source.subThemes;

  const excluded = excludeSubThemes
    ? source.subThemes.filter(st => isExcluded(st.name))
    : [];

  console.log(`\nCopie [${source.language}] ${source.name} → SAGE_FEMME`);
  console.log(`  ${subThemesToCopy.length} sous-thèmes copiés`);
  if (excluded.length) console.log(`  Exclus: ${excluded.map(s => s.name).join(', ')}`);

  const newTheme = await prisma.theme.create({
    data: {
      name: source.name,
      language: source.language,
      target: 'SAGE_FEMME',
      order: source.order,
      subThemes: {
        create: subThemesToCopy.map(st => ({
          name: st.name,
          order: st.order,
          questions: {
            create: st.questions.map(q => ({
              text: q.text,
              choiceA: q.choiceA,
              choiceB: q.choiceB,
              choiceC: q.choiceC,
              choiceD: q.choiceD,
              choiceE: q.choiceE,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              imageUrl: q.imageUrl,
              order: q.order,
              isActive: q.isActive,
            }))
          }
        }))
      }
    }
  });

  const qCount = subThemesToCopy.reduce((s, st) => s + st.questions.length, 0);
  console.log(`  ✅ Créé (id: ${newTheme.id}) — ${qCount} questions`);
}

async function main() {
  // Trouver ANATOMIE (FR + AR) dans INFIRMIER
  const anatomieThemes = await prisma.theme.findMany({
    where: {
      target: 'INFIRMIER',
      OR: [
        { name: { contains: 'anatomie', mode: 'insensitive' } },
        { name: { contains: 'التشريح', mode: 'insensitive' } },
      ]
    }
  });

  // Trouver PRATIQUE (FR + AR) dans INFIRMIER
  const pratiqueThemes = await prisma.theme.findMany({
    where: {
      target: 'INFIRMIER',
      OR: [
        { name: { contains: 'pratique', mode: 'insensitive' } },
        { name: { contains: 'الممارسة', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`\nANATOMIE trouvé: ${anatomieThemes.map(t => `[${t.language}] ${t.name}`).join(', ')}`);
  console.log(`PRATIQUE trouvé: ${pratiqueThemes.map(t => `[${t.language}] ${t.name}`).join(', ')}`);

  for (const t of anatomieThemes) await copyThemeToSF(t.id, false);
  for (const t of pratiqueThemes)  await copyThemeToSF(t.id, true);

  console.log('\n=== Thèmes SAGE_FEMME finaux ===');
  const sf = await prisma.theme.findMany({
    where: { target: 'SAGE_FEMME' },
    include: { _count: { select: { subThemes: true } } }
  });
  sf.forEach(t => console.log(`  [${t.language}] ${t.name} (${t._count.subThemes} ss-thèmes)`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
