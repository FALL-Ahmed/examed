import * as fs from 'fs';
import * as JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';

const INPUT = 'C:\\Users\\PC\\Telechargement\\Guide-de-la-sage-femme-correction.docx';
const prisma = new PrismaClient();

async function extractParagraphs(docxPath: string): Promise<{ style: string; text: string }[]> {
  const buf = fs.readFileSync(docxPath);
  const zip = await (JSZip as any).loadAsync(buf);
  const xml: string = await zip.file('word/document.xml').async('string');
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const styleRegex = /<w:pStyle w:val="([^"]+)"/;
  const paras: { style: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(xml)) !== null) {
    const sm = styleRegex.exec(m[0]);
    const style = sm ? sm[1] : 'Normal';
    const text = m[0].replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (text) paras.push({ style, text });
  }
  return paras;
}

function isAnswerLabel(norm: string): boolean {
  return norm === 'réponses correctes'
    || norm === 'réponse correcte'
    || norm === 'reponses correctes'
    || norm === 'réponses'
    || norm === 'réponse'
    || norm === 'réponse(s)'
    || norm === 'reponse(s)'
    || norm === 'reponses';
}

function cleanAnswer(text: string): string {
  // "B, D" → "B,D"  |  "A D" → "A,D"  |  "A, B, C," → "A,B,C"
  return text
    .replace(/[,\s]+/g, ',')  // virgules/espaces → simple virgule
    .replace(/,+/g, ',')       // doublons
    .replace(/^,|,$/g, '')     // trim virgules
    .toUpperCase();
}

type QData = { text: string; correctAnswer: string; explanation: string; subTheme: string };

async function main() {
  const paras = await extractParagraphs(INPUT);
  const CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

  // Sections à extraire : { Titre2 ou Titre3 contenant le mot clé → target SAGE_FEMME }
  // On parse TOUT le doc et on suit les sections
  let currentSection2 = '';
  let currentSubTheme = '';
  let currentQuestion: any = null;
  let lastChoiceLetter = '';
  let state: 'idle' | 'question' | 'choice' | 'answers' | 'comment' = 'idle';
  const questions: QData[] = [];

  // Sections pertinentes (Titre2)
  const TARGET_SECTIONS2 = ['gynecologie', 'obstetrique'];

  function inTargetSection() {
    return TARGET_SECTIONS2.some(s => currentSection2.toLowerCase().includes(s));
  }

  function saveQuestion() {
    if (currentQuestion?.text && currentQuestion.correctAnswer) {
      questions.push({
        text: currentQuestion.text,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation || '',
        subTheme: currentSubTheme,
      });
    }
    currentQuestion = null;
    state = 'idle';
    lastChoiceLetter = '';
  }

  for (const { style, text } of paras) {
    if (style === 'Titre2' || style === 'Heading2') {
      saveQuestion();
      currentSection2 = text;
      currentSubTheme = '';
      continue;
    }

    if (style === 'Titre3' || style === 'Heading3') {
      saveQuestion();
      currentSubTheme = text.replace(/:+\s*$/, '').trim();
      continue;
    }

    if (!inTargetSection()) continue;

    if (/^Q\d+$/.test(text)) {
      saveQuestion();
      currentQuestion = { text: '', correctAnswer: '', explanation: '' };
      state = 'question';
      continue;
    }

    if (!currentQuestion) continue;

    if (state === 'question') {
      currentQuestion.text = text;
      state = 'choice';
      continue;
    }

    const norm = text.trim().toLowerCase().replace(/\s+/g, ' ');

    if (isAnswerLabel(norm)) {
      state = 'answers';
      lastChoiceLetter = '';
      continue;
    }

    if (state === 'answers') {
      const cleaned = cleanAnswer(text);
      if (/^[A-E](,[A-E])*$/.test(cleaned)) {
        currentQuestion.correctAnswer = cleaned;
        state = 'comment';
      }
      continue;
    }

    if (norm === 'commentaire') {
      state = 'comment';
      continue;
    }

    if (state === 'comment' && !currentQuestion.explanation && text.length > 10
        && !CHOICES.has(text) && !/^Q\d+$/.test(text) && !isAnswerLabel(norm)) {
      currentQuestion.explanation = text;
      state = 'idle';
      continue;
    }

    if (state === 'choice' && CHOICES.has(text)) {
      lastChoiceLetter = text;
      continue;
    }

    if (state === 'choice' && lastChoiceLetter && !CHOICES.has(text) && !/^Q\d+$/.test(text) && !isAnswerLabel(norm)) {
      lastChoiceLetter = '';
      continue;
    }
  }
  saveQuestion();

  // Filtrer uniquement les sous-thèmes qui ont encore des questions sans réponse en DB
  const TARGET_SUBTHEMES = [
    'hypertension', 'medicament', 'contraception',
    'accouchement', 'alimentation', 'fièvre', 'hémorragie', 'dystoci',
    'infection', 'rythme', 'grossesse normale', 'gynecologie',
  ];

  const filtered = questions.filter(q => {
    const st = q.subTheme.toLowerCase();
    return TARGET_SUBTHEMES.some(t => st.includes(t));
  });

  console.log(`\n✅ ${filtered.length} questions extraites avec réponse`);
  const byS: Record<string, number> = {};
  filtered.forEach(q => { byS[q.subTheme] = (byS[q.subTheme] ?? 0) + 1; });
  Object.entries(byS).forEach(([s, n]) => console.log(`  └─ ${s}: ${n}`));

  let updated = 0, skipped = 0, notFound = 0;

  for (const q of filtered) {
    // Ne mettre à jour que les questions SANS réponse en DB
    const existing = await prisma.question.findFirst({
      where: {
        text: q.text,
        correctAnswer: '',
        subTheme: { theme: { target: 'SAGE_FEMME' } },
      },
    });

    if (!existing) {
      // Essai partiel
      const partial = q.text.slice(0, 60);
      const candidates = await prisma.question.findMany({
        where: {
          text: { startsWith: partial },
          correctAnswer: '',
          subTheme: { theme: { target: 'SAGE_FEMME' } },
        },
      });
      if (candidates.length === 1) {
        await prisma.question.update({
          where: { id: candidates[0].id },
          data: {
            correctAnswer: q.correctAnswer,
            ...(q.explanation && !candidates[0].explanation ? { explanation: q.explanation } : {}),
          },
        });
        updated++;
      } else {
        notFound++;
        if (notFound <= 10) console.log('  ⚠️ Non trouvé:', q.text.slice(0, 60), `(${candidates.length} candidats)`);
      }
      continue;
    }

    await prisma.question.update({
      where: { id: existing.id },
      data: {
        correctAnswer: q.correctAnswer,
        ...(q.explanation && !existing.explanation ? { explanation: q.explanation } : {}),
      },
    });
    updated++;
  }

  console.log(`\n✅ ${updated} questions FR mises à jour`);
  if (notFound > 0) console.log(`⚠️  ${notFound} non trouvées`);

  // --- Maintenant copier les réponses FR → AR pour les questions AR sans réponse ---
  console.log('\n--- Correction questions AR ---');

  const arEmpty = await prisma.question.findMany({
    where: {
      correctAnswer: '',
      subTheme: { theme: { target: 'SAGE_FEMME', language: 'AR' } },
    },
    include: { subTheme: { include: { theme: true } } },
    orderBy: { order: 'asc' },
  });

  console.log(`${arEmpty.length} questions AR sans réponse`);
  let arUpdated = 0;

  for (const arQ of arEmpty) {
    // Trouver la FR correspondante : même sous-thème (par nom similaire) + même order
    const subThemeFrName = arQ.subTheme.name; // peut contenir le nom FR entre parenthèses
    const frQ = await prisma.question.findFirst({
      where: {
        order: arQ.order,
        correctAnswer: { not: '' },
        subTheme: {
          name: { contains: subThemeFrName.includes('(') ? subThemeFrName.split('(')[1].split(')')[0] : subThemeFrName.slice(0, 20) },
          theme: { target: 'SAGE_FEMME', language: 'FR' },
        },
      },
    });

    if (frQ) {
      await prisma.question.update({
        where: { id: arQ.id },
        data: { correctAnswer: frQ.correctAnswer },
      });
      arUpdated++;
    } else {
      console.log('  ⚠️ AR non résolu:', arQ.text.slice(0, 50), '(order:', arQ.order, ')');
    }
  }

  console.log(`✅ ${arUpdated}/${arEmpty.length} questions AR mises à jour`);

  await prisma.$disconnect();
}

main().catch(console.error);
