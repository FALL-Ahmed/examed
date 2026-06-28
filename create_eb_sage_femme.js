const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

// ── Parser pour le format "examen blanc final" ────────────────────────────────
// Format : Q1 <texte> A <choixA> B <choixB> C <choixC> D <choixD> E <choixE>
//          Réponses B, D, E Commentaire <explication>
// Pour les CAS 11-20 : "CAS 11 :" → même format

function parseQuestionsFr(text) {
  // Normaliser : remplacer "CAS 11 :" etc. par Q11
  text = text.replace(/CAS\s+(\d+)\s*:/g, 'Q$1 ');

  // Séparer sur chaque Q\d+ suivi d'un caractère non-numérique
  const blocks = text.split(/(?=Q\d{1,2}\s+[^0-9])/);
  const questions = [];

  for (const block of blocks) {
    if (!/^Q\d{1,2}\s/.test(block.trim())) continue;

    // Texte du scénario : entre Q\d+ et la première option " A "
    const textM = block.match(/^Q\d{1,2}\s+(.+?)\s+A\s+/s);
    if (!textM) continue;
    const text_q = textM[1].trim();

    // Chaque option délimitée par la suivante ou par "Réponses"
    const optA = block.match(/\bA\s+([\s\S]+?)\s+B\s+/)?.[1]?.trim();
    const optB = block.match(/\bB\s+([\s\S]+?)\s+C\s+/)?.[1]?.trim();
    const optC = block.match(/\bC\s+([\s\S]+?)\s+D\s+/)?.[1]?.trim();
    const optD = block.match(/\bD\s+([\s\S]+?)\s+E\s+/)?.[1]?.trim();
    const optE = block.match(/\bE\s+([\s\S]+?)\s+Réponses?/)?.[1]?.trim();

    // Réponse correcte — stopper avant "Commentaire"
    const ansM = block.match(/Réponses?\s+([A-E][A-E,\s]*?)\s*Commentaire/s);
    if (!ansM) continue;
    const correctAnswer = [...new Set([...ansM[1].matchAll(/[A-E]/g)].map(m => m[0]))].sort().join(',');

    // Commentaire
    const comM = block.match(/Commentaire\s+([\s\S]+?)(?=Q\d{1,2}\s|$)/);
    const explanation = comM?.[1]?.trim() || '';

    if (!optA || !optB || !optC || !optD || !optE || !correctAnswer) continue;

    questions.push({
      text: text_q,
      choiceA: optA, choiceB: optB, choiceC: optC, choiceD: optD, choiceE: optE,
      correctAnswer,
      explanation,
    });
  }
  return questions;
}

function parseQuestionsAr(linesPath) {
  const AR_MAP = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'ه': 'E', 'هـ': 'E' };
  const lines = fs.readFileSync(linesPath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
  const questions = [];

  let i = 0;
  while (i < lines.length) {
    // Chercher س\d+
    if (!/^س\d{1,2}$/.test(lines[i])) { i++; continue; }
    i++; // passer sur le numéro

    // Texte question (peut s'étaler sur plusieurs lignes jusqu'à "أ")
    let text_q = '';
    while (i < lines.length && lines[i] !== 'أ') {
      text_q += (text_q ? ' ' : '') + lines[i];
      i++;
    }
    if (i >= lines.length) continue;
    i++; // passer "أ"

    // Options : lettre seule sur une ligne, texte sur la suivante
    const opts = {};
    const optLetters = ['أ', 'ب', 'ج', 'د', 'هـ'];
    // On vient de passer "أ", donc on lit le texte de A puis B, C, D, هـ
    const allLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'الأجوبة'];
    let curLetter = 'أ';
    let curText = '';

    while (i < lines.length && lines[i] !== 'الأجوبة') {
      const next = allLetters.indexOf(lines[i]);
      if (next > 0) { // c'est une nouvelle lettre option
        opts[curLetter] = curText.trim();
        curLetter = lines[i];
        curText = '';
      } else {
        curText += (curText ? ' ' : '') + lines[i];
      }
      i++;
    }
    opts[curLetter] = curText.trim(); // sauver la dernière option (هـ)

    if (lines[i] === 'الأجوبة') i++; // passer "الأجوبة"

    // Ligne des réponses
    const ansLine = lines[i] || '';
    const correctAnswer = [...new Set(
      [...ansLine].map(c => AR_MAP[c] || null).filter(Boolean)
    )].sort().join(',');
    i++;

    // Commentaire
    if (lines[i] === 'تعليق') i++;
    let explanation = '';
    while (i < lines.length && !/^س\d{1,2}$/.test(lines[i]) && lines[i] !== 'الأجوبة') {
      explanation += (explanation ? ' ' : '') + lines[i];
      i++;
    }

    const optA = opts['أ'], optB = opts['ب'], optC = opts['ج'];
    const optD = opts['د'], optE = opts['هـ'];

    if (!text_q || !optA || !optB || !optC || !optD || !optE || !correctAnswer) continue;

    questions.push({
      text: text_q, choiceA: optA, choiceB: optB, choiceC: optC,
      choiceD: optD, choiceE: optE, correctAnswer, explanation,
    });
  }
  return questions;
}

async function main() {
  const frText = fs.readFileSync(process.env.TEMP + '\\eb_fr.txt', 'utf-8');
  const arText = fs.readFileSync(process.env.TEMP + '\\eb_ar.txt', 'utf-8');

  console.log('📖 Parsing FR...');
  const frQuestions = parseQuestionsFr(frText);
  console.log(`   → ${frQuestions.length} questions FR`);
  frQuestions.slice(0,3).forEach((q,i) => console.log(`   [${i+1}] ${q.text.substring(0,60)}... → ${q.correctAnswer}`));

  console.log('📖 Parsing AR...');
  const arQuestions = parseQuestionsAr(process.env.TEMP + '\\eb_ar_lines.txt');
  console.log(`   → ${arQuestions.length} questions AR`);

  if (frQuestions.length < 10) {
    console.error('❌ Trop peu de questions FR parsées. Vérifier le format.');
    process.exit(1);
  }

  // Thème temporaire (non publié) pour stocker les questions EB
  const themeFr = await prisma.theme.upsert({
    where: { name_language_target: { name: 'EXAMEN BLANC JUILLET 2026', language: 'FR', target: 'SAGE_FEMME' } },
    create: { name: 'EXAMEN BLANC JUILLET 2026', language: 'FR', target: 'SAGE_FEMME', isPublished: false },
    update: {},
  });
  const themeAr = await prisma.theme.upsert({
    where: { name_language_target: { name: 'EXAMEN BLANC JUILLET 2026', language: 'AR', target: 'SAGE_FEMME' } },
    create: { name: 'EXAMEN BLANC JUILLET 2026', language: 'AR', target: 'SAGE_FEMME', isPublished: false },
    update: {},
  });
  const subFr = await prisma.subTheme.upsert({
    where: { themeId_name: { themeId: themeFr.id, name: 'Questions EB' } },
    create: { name: 'Questions EB', themeId: themeFr.id },
    update: {},
  });
  const subAr = await prisma.subTheme.upsert({
    where: { themeId_name: { themeId: themeAr.id, name: 'Questions EB AR' } },
    create: { name: 'Questions EB AR', themeId: themeAr.id },
    update: {},
  });

  // Supprimer les questions précédentes (idempotent)
  await prisma.question.deleteMany({ where: { subThemeId: { in: [subFr.id, subAr.id] } } });

  // Importer FR
  console.log('\n📥 Import FR...');
  const frIds = [];
  for (let i = 0; i < frQuestions.length; i++) {
    const q = await prisma.question.create({ data: { ...frQuestions[i], subThemeId: subFr.id, order: i+1, isActive: true } });
    frIds.push(q.id);
  }
  console.log(`   ✓ ${frIds.length} questions FR importées`);

  // Importer AR
  console.log('📥 Import AR...');
  const arIds = [];
  for (let i = 0; i < arQuestions.length; i++) {
    const q = await prisma.question.create({ data: { ...arQuestions[i], subThemeId: subAr.id, order: i+1, isActive: true } });
    arIds.push(q.id);
  }
  console.log(`   ✓ ${arIds.length} questions AR importées`);

  // Créer l'Examen Blanc
  const startsAt  = new Date('2026-07-28T12:00:00.000Z');
  const endsAt    = new Date('2026-07-28T21:00:00.000Z');
  const resultsAt = new Date('2026-07-28T21:00:00.000Z');

  const qFr = frIds.slice(0, 60);
  const qAr = arIds.slice(0, 60);

  const eb = await prisma.examenBlanc.create({
    data: {
      title: 'Examen Blanc National — Sage-Femme',
      descriptionFr: 'Examen blanc préparatoire pour les étudiants sages-femmes. 60 questions, durée 2h.',
      descriptionAr: 'امتحان تجريبي تحضيري لطلاب القابلات. 60 سؤالاً، مدة ساعتين.',
      startsAt, endsAt, resultsAt,
      questionIdsFr: qFr,
      questionIdsAr: qAr,
      totalQ: 60,
      durationMin: 120,
      target: 'SAGE_FEMME',
    },
  });

  console.log(`\n✅ Examen Blanc créé !`);
  console.log(`   ID        : ${eb.id}`);
  console.log(`   Début     : 28 juillet 2026 à 12h00`);
  console.log(`   Fin       : 28 juillet 2026 à 21h00`);
  console.log(`   Résultats : 28 juillet 2026 à 21h00`);
  console.log(`   Questions FR: ${eb.questionIdsFr.length} / Questions AR: ${eb.questionIdsAr.length}`);
  console.log(`   Target    : ${eb.target}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
