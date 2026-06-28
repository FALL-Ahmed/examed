/**
 * build_eb_sage_femme_final.js
 * Crée l'Examen Blanc Sage-Femme Juillet 2026 avec la bonne répartition :
 *   FR: 45 cas cliniques (docx) + 3 cancer col + 3 contraception + 3 leucorrhée + 3 IST + 3 PTME = 60
 *   AR: 45 cas cliniques (docx) + 3 سرطان عنق + 3 contraception + 3 leucorrhée + 3 IST + 3 PTME = 60
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

// ─── Supprimer tous les EBs SAGE_FEMME juillet 2026 existants ────────────────
async function cleanupPreviousEBs() {
  const old = await prisma.examenBlanc.findMany({
    where: { target: 'SAGE_FEMME', startsAt: new Date('2026-07-28T12:00:00.000Z') }
  });
  if (old.length) {
    await prisma.examenBlanc.deleteMany({ where: { id: { in: old.map(e => e.id) } } });
    console.log(`✓ ${old.length} EB(s) précédent(s) supprimé(s)`);
  }
}

// ─── Importer les 3 questions PTME FR dans VIH SAGE_FEMME ────────────────────
async function importPtmeFr() {
  const eb7 = require('C:/Users/PC/Telechargement/eb7_infirmier_fr.json');
  const vihTheme = eb7.themes.find(t => /VIH/.test(t.name));
  const ptmeSub = (vihTheme.subThemes || vihTheme.sous_themes || []).find(s => /PTME/.test(s.name));

  // Trouver le thème VIH FR SAGE_FEMME
  const vihThemeDb = await prisma.theme.findFirst({
    where: { target: 'SAGE_FEMME', language: 'FR', name: { contains: 'VIH' } }
  });
  if (!vihThemeDb) throw new Error('Thème VIH FR SAGE_FEMME introuvable');

  // Créer ou récupérer le sous-thème PTME
  const ptmeSubDb = await prisma.subTheme.upsert({
    where: { themeId_name: { themeId: vihThemeDb.id, name: 'PTME DU VIH ET HÉPATITE B' } },
    create: { name: 'PTME DU VIH ET HÉPATITE B', themeId: vihThemeDb.id },
    update: {},
  });

  // Supprimer les questions précédentes (idempotent)
  await prisma.question.deleteMany({ where: { subThemeId: ptmeSubDb.id } });

  const ids = [];
  for (let i = 0; i < ptmeSub.questions.length; i++) {
    const q = ptmeSub.questions[i];
    const opts = q.options || {};
    const created = await prisma.question.create({
      data: {
        text: q.text || q.question,
        choiceA: q.choiceA || opts.A || '',
        choiceB: q.choiceB || opts.B || '',
        choiceC: q.choiceC || opts.C || '',
        choiceD: q.choiceD || opts.D || '',
        choiceE: q.choiceE || opts.E || '',
        correctAnswer: Array.isArray(q.reponses) ? q.reponses.join(',') : (q.correctAnswer || ''),
        explanation: q.explanation || q.commentaire || '',
        subThemeId: ptmeSubDb.id,
        order: i + 1,
        isActive: true,
      }
    });
    ids.push(created.id);
  }
  console.log(`✓ ${ids.length} questions PTME FR importées (VIH SAGE_FEMME)`);
  return ids;
}

// ─── Récupérer N questions d'un sous-thème ────────────────────────────────────
async function getQuestionsFromSub(subName, themeName, language, target, take) {
  const sub = await prisma.subTheme.findFirst({
    where: {
      name: { contains: subName, mode: 'insensitive' },
      theme: { language, target, name: { contains: themeName, mode: 'insensitive' } }
    }
  });
  if (!sub) throw new Error(`Sous-thème "${subName}" (${language} ${target}) introuvable`);
  const qs = await prisma.question.findMany({
    where: { subThemeId: sub.id, isActive: true },
    select: { id: true },
    take,
    orderBy: { order: 'asc' },
  });
  return qs.map(q => q.id);
}

// ─── Récupérer les questions du docx EB (thème temporaire) ────────────────────
async function getEBDocxQuestions(language, count) {
  const theme = await prisma.theme.findFirst({
    where: { name: 'EXAMEN BLANC JUILLET 2026', language, target: 'SAGE_FEMME' },
    include: { subThemes: { include: { questions: { select: { id: true }, orderBy: { order: 'asc' } } } } }
  });
  if (!theme) throw new Error(`Thème EB docx ${language} introuvable`);
  const ids = theme.subThemes.flatMap(s => s.questions.map(q => q.id));
  return ids.slice(0, count);
}

async function main() {
  await cleanupPreviousEBs();

  // ── Importer PTME FR ─────────────────────────────────────────────────────────
  const ptmeFrIds = await importPtmeFr();

  // ── FR : 45 cas cliniques + 15 QCM ──────────────────────────────────────────
  console.log('\n📋 Construction FR...');
  const frCasCliniques = await getEBDocxQuestions('FR', 45);
  console.log(`  ✓ ${frCasCliniques.length} cas cliniques FR`);

  const frCancerCol   = await getQuestionsFromSub('PRÉVENTION DU CANCER', 'GYNECOLOGIE', 'FR', 'SAGE_FEMME', 3);
  const frContracept  = await getQuestionsFromSub('CONTRACEPTION', 'GYNECOLOGIE', 'FR', 'SAGE_FEMME', 3);
  const frLeucorrhee  = await getQuestionsFromSub('Leucorrhée', 'GYNECOLOGIE', 'FR', 'SAGE_FEMME', 3);
  const frIST         = await getQuestionsFromSub('Infections sexuellement', 'GYNECOLOGIE', 'FR', 'SAGE_FEMME', 3);
  const frPtme        = ptmeFrIds.slice(0, 3);
  console.log(`  ✓ Cancer col: ${frCancerCol.length}, Contraception: ${frContracept.length}, Leucorrhée: ${frLeucorrhee.length}, IST: ${frIST.length}, PTME: ${frPtme.length}`);

  const questionIdsFr = [...frCasCliniques, ...frCancerCol, ...frContracept, ...frLeucorrhee, ...frIST, ...frPtme];
  console.log(`  → Total FR: ${questionIdsFr.length} questions`);

  // ── AR : 45 cas cliniques + 15 QCM ──────────────────────────────────────────
  console.log('\n📋 Construction AR...');
  const arCasCliniques = await getEBDocxQuestions('AR', 45);
  console.log(`  ✓ ${arCasCliniques.length} cas cliniques AR`);

  const arCancerCol  = await getQuestionsFromSub('سرطان عنق', 'Gynécologie', 'AR', 'SAGE_FEMME', 3);
  const arContracept = await getQuestionsFromSub('منع الحمل', 'Gynécologie', 'AR', 'SAGE_FEMME', 3);
  const arLeucorrhee = await getQuestionsFromSub('الإفرازات', 'Gynécologie', 'AR', 'SAGE_FEMME', 3);
  const arIST        = await getQuestionsFromSub('المنقولة جنسياً', 'Gynécologie', 'AR', 'SAGE_FEMME', 3);

  // PTME AR : prendre dans INFIRMIER AR (الوقاية من انتقال السيدا)
  const ptmeArSub = await prisma.subTheme.findFirst({
    where: {
      name: { contains: 'PTME' },
      theme: { target: 'INFIRMIER', language: 'AR' }
    }
  });
  if (!ptmeArSub) throw new Error('Sous-thème PTME AR INFIRMIER introuvable');
  const arPtme = (await prisma.question.findMany({
    where: { subThemeId: ptmeArSub.id, isActive: true },
    select: { id: true },
    take: 3, orderBy: { order: 'asc' }
  })).map(q => q.id);

  console.log(`  ✓ Cancer col: ${arCancerCol.length}, Contraception: ${arContracept.length}, Leucorrhée: ${arLeucorrhee.length}, IST: ${arIST.length}, PTME: ${arPtme.length}`);

  const questionIdsAr = [...arCasCliniques, ...arCancerCol, ...arContracept, ...arLeucorrhee, ...arIST, ...arPtme];
  console.log(`  → Total AR: ${questionIdsAr.length} questions`);

  if (questionIdsFr.length !== 60) throw new Error(`FR: ${questionIdsFr.length} ≠ 60`);
  if (questionIdsAr.length !== 60) throw new Error(`AR: ${questionIdsAr.length} ≠ 60`);

  // ── Créer l'ExamenBlanc ──────────────────────────────────────────────────────
  const eb = await prisma.examenBlanc.create({
    data: {
      title: 'Examen Blanc National — Sage-Femme',
      descriptionFr: 'Examen blanc préparatoire pour les étudiants sages-femmes. 60 questions, durée 2h.',
      descriptionAr: 'امتحان تجريبي تحضيري لطلاب القابلات. 60 سؤالاً، مدة ساعتين.',
      startsAt:  new Date('2026-07-28T12:00:00.000Z'),
      endsAt:    new Date('2026-07-28T21:00:00.000Z'),
      resultsAt: new Date('2026-07-28T21:00:00.000Z'),
      questionIdsFr,
      questionIdsAr,
      totalQ: 60,
      durationMin: 120,
      target: 'SAGE_FEMME',
    },
  });

  console.log('\n✅ Examen Blanc créé !');
  console.log(`   ID        : ${eb.id}`);
  console.log(`   Début     : 28 juillet 2026 à 12h00`);
  console.log(`   Fin       : 28 juillet 2026 à 21h00`);
  console.log(`   Résultats : 28 juillet 2026 à 21h00`);
  console.log(`   Q FR      : ${eb.questionIdsFr.length} (45 cas clin. + 3 cancer col + 3 contracep. + 3 leucorrhée + 3 IST + 3 PTME)`);
  console.log(`   Q AR      : ${eb.questionIdsAr.length} (45 cas clin. + 3 سرطان عنق + 3 منع الحمل + 3 إفرازات + 3 IST + 3 PTME)`);

  await prisma.$disconnect();
}

main().catch(e => { console.error('❌', e.message); prisma.$disconnect(); process.exit(1); });
