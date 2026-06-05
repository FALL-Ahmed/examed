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

type QData = { text: string; correctAnswer: string; explanation: string };

async function main() {
  const paras = await extractParagraphs(INPUT);
  const CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

  // Parser flexible : case-insensitive pour "Réponses correctes"
  let currentSubTheme = '';
  let currentQuestion: any = null;
  let lastChoiceLetter = '';
  let state: 'idle' | 'question' | 'choice' | 'answers' | 'comment' = 'idle';
  const questions: (QData & { subTheme: string })[] = [];

  let inObs = false;

  function saveQuestion() {
    if (currentQuestion?.text && currentQuestion.correctAnswer) {
      questions.push({ ...currentQuestion, subTheme: currentSubTheme });
    }
    currentQuestion = null;
    state = 'idle';
    lastChoiceLetter = '';
  }

  for (const { style, text } of paras) {
    if (style === 'Titre2' || style === 'Heading2') {
      if (text.toLowerCase().includes('obstetrique') || text.toLowerCase().includes('obstétrique')) {
        inObs = true;
        saveQuestion();
        continue;
      } else if (inObs) {
        break; // fin de la section
      }
      continue;
    }

    if (!inObs) continue;

    if (style === 'Titre3' || style === 'Heading3') {
      saveQuestion();
      currentSubTheme = text.replace(/:+\s*$/, '').trim();
      continue;
    }

    if (/^Q\d+$/.test(text)) {
      saveQuestion();
      currentQuestion = { text: '', choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: '', correctAnswer: '', explanation: '' };
      state = 'question';
      continue;
    }

    if (!currentQuestion) continue;

    if (state === 'question') {
      currentQuestion.text = text;
      state = 'choice';
      continue;
    }

    if (state === 'choice' && CHOICES.has(text)) {
      lastChoiceLetter = text;
      continue;
    }

    // Réponses correctes — insensible à la casse
    const normText = text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normText === 'réponses correctes' || normText === 'réponse correcte' || normText === 'reponses correctes') {
      state = 'answers';
      lastChoiceLetter = '';
      continue;
    }

    if (state === 'answers') {
      // La réponse peut être "A", "A, B, C", "A,B,C"
      const cleaned = text.replace(/\s/g, '').toUpperCase();
      if (/^[A-E](,[A-E])*$/.test(cleaned)) {
        currentQuestion.correctAnswer = cleaned;
        state = 'comment';
      }
      continue;
    }

    if (normText === 'commentaire') {
      state = 'comment';
      continue;
    }

    if (state === 'comment' && !currentQuestion.explanation && text.length > 10 && !CHOICES.has(text) && !/^Q\d+$/.test(text)) {
      currentQuestion.explanation = text;
      state = 'idle';
      continue;
    }

    if (state === 'choice' && lastChoiceLetter && text !== 'Commentaire' && !CHOICES.has(text) && !/^Q\d+$/.test(text)) {
      if (normText !== 'réponses correctes' && normText !== 'réponse correcte') {
        currentQuestion[`choice${lastChoiceLetter}`] = text;
        lastChoiceLetter = '';
      }
      continue;
    }
  }
  saveQuestion();

  console.log(`\n✅ ${questions.length} questions avec réponse extraites de OBSTETRIQUE`);

  const bySubTheme: Record<string, number> = {};
  questions.forEach(q => { bySubTheme[q.subTheme] = (bySubTheme[q.subTheme] ?? 0) + 1; });
  Object.entries(bySubTheme).forEach(([st, n]) => console.log(`  └─ ${st}: ${n}`));

  // Mettre à jour la DB : chercher par text exact dans les sous-thèmes SAGE_FEMME OBSTETRIQUE
  let updated = 0;
  let notFound = 0;

  for (const q of questions) {
    const existing = await prisma.question.findFirst({
      where: {
        text: q.text,
        subTheme: {
          theme: { target: 'SAGE_FEMME' },
        },
      },
    });

    if (!existing) {
      // Chercher par text partiel (premiers 80 chars)
      const partial = q.text.slice(0, 80);
      const candidates = await prisma.question.findMany({
        where: {
          text: { startsWith: partial.slice(0, 60) },
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
        if (notFound <= 5) console.log('  ⚠️ Non trouvé:', q.text.slice(0, 60), '(', candidates.length, 'candidats)');
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

  console.log(`\n✅ ${updated} questions mises à jour en DB`);
  if (notFound > 0) console.log(`⚠️  ${notFound} questions non trouvées en DB`);

  await prisma.$disconnect();
}

main().catch(console.error);
