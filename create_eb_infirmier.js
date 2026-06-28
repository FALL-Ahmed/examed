/**
 * create_eb_infirmier.js
 * Crée l'Examen Blanc Infirmier EB7 — 28 juillet 2026
 * FR: 67q → 60 (réduit les gros thèmes)
 * AR: 66q → 60 (réduit les gros thèmes)
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

// Nombre max de questions à prendre par thème (FR)
const LIMITS_FR = {
  'URGENCES CHIRURGICALES':           6,  // 7 → 6
  'CARDIOLOGIE':                       5,  // 6 → 5
  'ENDOCRINOLOGIE':                    3,
  'GASTROLOGIE':                       1,
  'SEMIOLOGIE':                        1,
  'ORTHOPEDIE':                        3,
  'PHARMACOLOGIE':                     2,
  'PRATIQUE DE LA SCIENCE INFIRMIERE': 8,  // 10 → 8
  'PEDIATRIE':                         6,  // 7 → 6
  'VIH':                               3,
  'PNEUMOLOGIE':                       4,
  'SECOURISME':                        5,
  'LES MALADIES INFECTIEUSES':        10,  // 12 → 10
  'SANTÉ PUBLIQUE':                    3,
};

// Nombre max de questions à prendre par thème (AR)
const LIMITS_AR = {
  'الطوارئ الجراحية':                 7,
  'طب القلب والأوعية الدموية':        5,  // 6 → 5
  'الغدد الصماء':                     5,
  'أمراض الجهاز الهضمي':             1,
  'السيميولوجيا':                     1,
  'جراحة العظام والحروق':             3,
  'الدوائية والعلاج':                 1,
  'الممارسة التمريضية':               6,  // 8 → 6
  'طب الأطفال':                       6,  // 7 → 6
  'فيروس نقص المناعة البشرية':       3,
  'أمراض الجهاز التنفسي':            4,
  'الإسعاف والإنعاش':                5,
  'الأمراض المعدية':                 10,  // 12 → 10
  'الصحة العامة':                     3,
};

async function importLanguage(jsonPath, limits, language) {
  const data = require(jsonPath);

  // Thème temporaire non publié
  const theme = await prisma.theme.upsert({
    where: { name_language_target: { name: 'EXAMEN BLANC JUILLET 2026', language, target: 'INFIRMIER' } },
    create: { name: 'EXAMEN BLANC JUILLET 2026', language, target: 'INFIRMIER', isPublished: false },
    update: {},
  });

  // Supprimer les questions et sous-thèmes précédents
  const oldSubs = await prisma.subTheme.findMany({ where: { themeId: theme.id } });
  for (const s of oldSubs) {
    await prisma.question.deleteMany({ where: { subThemeId: s.id } });
    await prisma.subTheme.delete({ where: { id: s.id } });
  }

  const selectedIds = [];

  for (const t of data.themes) {
    const limit = limits[t.name];
    if (limit === undefined) {
      console.warn(`  ⚠ Thème inconnu dans limits: "${t.name}"`);
      continue;
    }

    // Collecter toutes les questions de ce thème (dans l'ordre des subThèmes)
    const allQs = [];
    for (const sub of t.subThemes) {
      for (const q of sub.questions) {
        allQs.push({ ...q, _subName: sub.name });
      }
    }

    // Prendre seulement `limit` questions
    const toImport = allQs.slice(0, limit);

    let imported = 0;
    for (const q of toImport) {
      // Sous-thème
      const subDb = await prisma.subTheme.upsert({
        where: { themeId_name: { themeId: theme.id, name: q._subName } },
        create: { name: q._subName, themeId: theme.id },
        update: {},
      });

      const created = await prisma.question.create({
        data: {
          text: q.text,
          choiceA: q.choiceA || '',
          choiceB: q.choiceB || '',
          choiceC: q.choiceC || '',
          choiceD: q.choiceD || '',
          choiceE: q.choiceE || '',
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          subThemeId: subDb.id,
          order: selectedIds.length + imported + 1,
          isActive: true,
        }
      });
      selectedIds.push(created.id);
      imported++;
    }
    console.log(`  ${language} | ${t.name}: ${imported}/${allQs.length}`);
  }

  console.log(`  → ${language} total: ${selectedIds.length} questions`);
  return selectedIds;
}

async function main() {
  // Supprimer l'EB juillet 2026 infirmier s'il existe
  const old = await prisma.examenBlanc.findMany({
    where: { target: 'INFIRMIER', startsAt: new Date('2026-07-28T12:00:00.000Z') }
  });
  if (old.length) {
    await prisma.examenBlanc.deleteMany({ where: { id: { in: old.map(e => e.id) } } });
    console.log(`✓ ${old.length} EB précédent supprimé`);
  }

  console.log('\n📥 Import FR...');
  const frIds = await importLanguage(
    'C:/Users/PC/Telechargement/examen_blanc_infirmier_fr.json',
    LIMITS_FR, 'FR'
  );

  console.log('\n📥 Import AR...');
  const arIds = await importLanguage(
    'C:/Users/PC/Telechargement/examen_blanc_infirmier_ar.json',
    LIMITS_AR, 'AR'
  );

  if (frIds.length !== 60) throw new Error(`FR: ${frIds.length} ≠ 60`);
  if (arIds.length !== 60) throw new Error(`AR: ${arIds.length} ≠ 60`);

  const eb = await prisma.examenBlanc.create({
    data: {
      title: 'Examen Blanc National 7',
      descriptionFr: 'Examen blanc préparatoire pour les étudiants infirmiers. 60 questions, durée 2h.',
      descriptionAr: 'امتحان تجريبي تحضيري لطلاب التمريض. 60 سؤالاً، مدة ساعتين.',
      startsAt:  new Date('2026-07-28T12:00:00.000Z'),
      endsAt:    new Date('2026-07-28T21:00:00.000Z'),
      resultsAt: new Date('2026-07-28T21:00:00.000Z'),
      questionIdsFr: frIds,
      questionIdsAr: arIds,
      totalQ: 60,
      durationMin: 120,
      target: 'INFIRMIER',
    },
  });

  console.log('\n✅ Examen Blanc 7 créé !');
  console.log(`   ID        : ${eb.id}`);
  console.log(`   Début     : 28 juillet 2026 à 12h00`);
  console.log(`   Fin       : 28 juillet 2026 à 21h00`);
  console.log(`   Résultats : 28 juillet 2026 à 21h00`);
  console.log(`   Q FR      : ${eb.questionIdsFr.length}`);
  console.log(`   Q AR      : ${eb.questionIdsAr.length}`);
  console.log(`   Target    : ${eb.target}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e.message); prisma.$disconnect(); process.exit(1); });
