const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const AdmZip = require('./backend/node_modules/adm-zip');
const prisma = new PrismaClient();

function extractText(docxPath) {
  const zip = new AdmZip(docxPath);
  const xml = zip.readAsText('word/document.xml');
  const matches = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
  return matches.map(m => m[1]).join(' ').replace(/\s+/g, ' ').trim();
}

function parseQuestions(text) {
  // Séparer sur les marqueurs de question : "Q\d+" ou "CAS \d+"
  // Pattern: (Q\d+|CAS \d+) suivi du texte jusqu'au prochain (Q\d+|CAS \d+) ou fin
  const blocks = text.split(/(?=\b(?:Q\d{1,2}|CAS\s+\d{1,2})\s+[A-ZÀ-Ÿa-zà-ÿ])/);

  const questions = [];

  for (const block of blocks) {
    // Doit commencer par Q\d ou CAS \d
    if (!/^(?:Q\d{1,2}|CAS\s+\d{1,2})\s+/.test(block.trim())) continue;

    // Extraire le texte du scénario (avant le choix A)
    const textMatch = block.match(/^(?:Q\d{1,2}|CAS\s+\d{1,2})\s+(.+?)(?=\s+A\s+[A-ZÀ-Ÿa-z\(])/s);
    if (!textMatch) continue;
    const questionText = textMatch[1].trim();

    // Extraire les 5 choix
    const choiceA = block.match(/\bA\s+(.+?)(?=\s+B\s+[A-ZÀ-Ÿa-z\(])/s)?.[1]?.trim();
    const choiceB = block.match(/\bB\s+(.+?)(?=\s+C\s+[A-ZÀ-Ÿa-z\(])/s)?.[1]?.trim();
    const choiceC = block.match(/\bC\s+(.+?)(?=\s+D\s+[A-ZÀ-Ÿa-z\(])/s)?.[1]?.trim();
    const choiceD = block.match(/\bD\s+(.+?)(?=\s+E\s+[A-ZÀ-Ÿa-z\(])/s)?.[1]?.trim();
    const choiceE = block.match(/\bE\s+(.+?)(?=\s+(?:Réponses?|الأجوبة|✓|\bRéponse))/s)?.[1]?.trim();

    // Extraire la réponse correcte
    const answerMatch = block.match(/(?:Réponses?\s+|الأجوبة\s*[:\s]*|✓\s*)([A-E](?:[,،\s]+[A-E])*)/);
    let correctAnswer = '';
    if (answerMatch) {
      correctAnswer = answerMatch[1].replace(/[^A-E]/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
    }

    // Extraire le commentaire/explication
    const explMatch = block.match(/(?:Commentaire|تعليق)\s+(.+?)$/s);
    const explanation = explMatch?.[1]?.trim() || '';

    if (questionText && choiceA && choiceB && choiceC && choiceD && choiceE && correctAnswer) {
      questions.push({ text: questionText, choiceA, choiceB, choiceC, choiceD, choiceE, correctAnswer, explanation });
    }
  }

  return questions;
}

async function main() {
  const frPath = process.env.TEMP + '\\eb_fr_tmp.docx';
  const arPath = process.env.TEMP + '\\eb_ar_tmp.docx';

  console.log('📖 Parsing FR...');
  const frText = extractText(frPath);
  const frQuestions = parseQuestions(frText);
  console.log(`   → ${frQuestions.length} questions FR extraites`);

  console.log('📖 Parsing AR...');
  const arText = extractText(arPath);
  const arQuestions = parseQuestions(arText);
  console.log(`   → ${arQuestions.length} questions AR extraites`);

  if (frQuestions.length === 0) { console.error('❌ Aucune question FR trouvée — vérifier le parser'); process.exit(1); }

  // Créer un thème temporaire pour stocker les questions de l'EB
  const tempTheme = await prisma.theme.upsert({
    where: { name_language_target: { name: 'EXAMEN BLANC JUILLET 2026', language: 'FR', target: 'SAGE_FEMME' } },
    create: { name: 'EXAMEN BLANC JUILLET 2026', language: 'FR', target: 'SAGE_FEMME', isPublished: false },
    update: {},
  });
  const tempThemeAr = await prisma.theme.upsert({
    where: { name_language_target: { name: 'EXAMEN BLANC JUILLET 2026', language: 'AR', target: 'SAGE_FEMME' } },
    create: { name: 'EXAMEN BLANC JUILLET 2026', language: 'AR', target: 'SAGE_FEMME', isPublished: false },
    update: {},
  });

  const subFr = await prisma.subTheme.upsert({
    where: { themeId_name: { themeId: tempTheme.id, name: 'Questions EB' } },
    create: { name: 'Questions EB', themeId: tempTheme.id },
    update: {},
  });
  const subAr = await prisma.subTheme.upsert({
    where: { themeId_name: { themeId: tempThemeAr.id, name: 'Questions EB AR' } },
    create: { name: 'Questions EB AR', themeId: tempThemeAr.id },
    update: {},
  });

  // Supprimer les anciennes questions si re-run
  await prisma.question.deleteMany({ where: { subThemeId: subFr.id } });
  await prisma.question.deleteMany({ where: { subThemeId: subAr.id } });

  // Importer questions FR
  console.log('\n📥 Import FR...');
  const frIds = [];
  for (let i = 0; i < frQuestions.length; i++) {
    const q = await prisma.question.create({
      data: { ...frQuestions[i], subThemeId: subFr.id, order: i + 1, isActive: true },
    });
    frIds.push(q.id);
  }
  console.log(`   ✓ ${frIds.length} questions FR importées`);

  // Importer questions AR
  console.log('📥 Import AR...');
  const arIds = [];
  for (let i = 0; i < arQuestions.length; i++) {
    const q = await prisma.question.create({
      data: { ...arQuestions[i], subThemeId: subAr.id, order: i + 1, isActive: true },
    });
    arIds.push(q.id);
  }
  console.log(`   ✓ ${arIds.length} questions AR importées`);

  // Créer l'Examen Blanc
  // 28 juillet 2026, 12h→21h Mauritanie = UTC (pas de décalage)
  const startsAt = new Date('2026-07-28T12:00:00.000Z');
  const endsAt   = new Date('2026-07-28T21:00:00.000Z');
  const resultsAt = new Date('2026-07-28T21:00:00.000Z');

  // Prendre 60 questions (les 60 premières si 61 parsées)
  const questionIdsFr = frIds.slice(0, 60);
  const questionIdsAr = arIds.slice(0, Math.min(60, arIds.length));

  const eb = await prisma.examenBlanc.create({
    data: {
      title: 'Examen Blanc National — Sage-Femme',
      descriptionFr: 'Examen blanc préparatoire pour les étudiants sages-femmes. 60 questions, durée 2h.',
      descriptionAr: 'امتحان تجريبي تحضيري لطلاب القابلات. 60 سؤالاً، مدة ساعتين.',
      startsAt,
      endsAt,
      resultsAt,
      questionIdsFr,
      questionIdsAr,
      totalQ: 60,
      durationMin: 120,
      target: 'SAGE_FEMME',
    },
  });

  console.log(`\n✅ Examen Blanc créé !`);
  console.log(`   ID       : ${eb.id}`);
  console.log(`   Titre    : ${eb.title}`);
  console.log(`   Début    : ${eb.startsAt.toISOString()}`);
  console.log(`   Fin      : ${eb.endsAt.toISOString()}`);
  console.log(`   Résultats: ${eb.resultsAt.toISOString()}`);
  console.log(`   Questions FR: ${eb.questionIdsFr.length}`);
  console.log(`   Questions AR: ${eb.questionIdsAr.length}`);
  console.log(`   Target   : ${eb.target}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
