import { PrismaClient } from '@prisma/client';
import * as mammoth from 'mammoth';

const prisma = new PrismaClient();

function normalize(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''`‘’“”]/g, "'")
    .replace(/[-‑‒–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  const wa = na.split(' ');
  const wb = new Set(nb.split(' '));
  const common = wa.filter(w => wb.has(w)).length;
  return (2 * common) / (wa.length + wb.size);
}

async function parseDocx(path: string) {
  const result = await (mammoth as any).extractRawText({ path });
  const lines = result.value.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

  const questions: any[] = [];
  let i = 0;

  while (i < lines.length) {
    // Chercher Q\d+
    if (!/^Q\d+$/.test(lines[i])) { i++; continue; }
    i++; // skip Qn
    if (i >= lines.length) break;

    // Lire le texte de la question (jusqu'à rencontrer "A" seul)
    let text = '';
    while (i < lines.length && lines[i] !== 'A') {
      text += (text ? ' ' : '') + lines[i];
      i++;
    }
    if (!text) continue;

    // Lire les choix A-E
    const choices: Record<string, string> = {};
    const choiceLetters = ['A','B','C','D','E'];

    for (const letter of choiceLetters) {
      if (i < lines.length && lines[i] === letter) {
        i++; // skip lettre
        let val = '';
        // Lire jusqu'à la prochaine lettre ou "Réponse"
        const nextLetterIdx = choiceLetters.indexOf(letter) + 1;
        const nextStop = nextLetterIdx < choiceLetters.length
          ? choiceLetters[nextLetterIdx]
          : null;
        while (i < lines.length) {
          const l = lines[i];
          if (l === nextStop || /^Réponse/i.test(l) || l === 'Commentaire' || /^Q\d+$/.test(l)) break;
          val += (val ? ' ' : '') + l;
          i++;
        }
        choices[`choice${letter}`] = val.trim();
      }
    }

    // Lire réponse correcte
    let correctAnswer = '';
    if (i < lines.length && /^Réponse/i.test(lines[i])) {
      i++;
      if (i < lines.length && !/^Commentaire$/i.test(lines[i]) && !/^Q\d+$/.test(lines[i])) {
        correctAnswer = lines[i].replace(/\s/g, '').toUpperCase();
        i++;
      }
    }

    // Skip commentaire
    if (i < lines.length && /^Commentaire$/i.test(lines[i])) {
      i++;
      while (i < lines.length && !/^Q\d+$/.test(lines[i])) i++;
    }

    questions.push({ text, ...choices, correctAnswer });
  }

  return questions;
}

async function main() {
  console.log('Parsing DOCX...');
  const docxQuestions = await parseDocx('C:/Users/PC/Telechargement/Guide-de-la-sage-femme-correction.docx');
  console.log(`DOCX: ${docxQuestions.length} questions parsées\n`);

  const choiceFields = ['choiceA','choiceB','choiceC','choiceD','choiceE'] as const;
  const placeholders = ['Commentaire','Comment','commentaire'];

  const dbQuestions = await (prisma as any).question.findMany({
    where: { OR: choiceFields.map(c => ({ [c]: { in: placeholders } })) },
  });
  console.log(`DB: ${dbQuestions.length} questions à corriger\n`);

  let fixed = 0, skipped = 0;

  for (const dbQ of dbQuestions) {
    let bestMatch: any = null, bestScore = 0;
    for (const dQ of docxQuestions) {
      const score = similarity(dbQ.text, dQ.text);
      if (score > bestScore) { bestScore = score; bestMatch = dQ; }
    }

    if (!bestMatch || bestScore < 0.45) {
      console.log(`⚠️  PAS DE MATCH (${bestScore.toFixed(2)}): ${dbQ.text.slice(0,70)}`);
      skipped++; continue;
    }

    const update: any = {};
    for (const c of choiceFields) {
      if (placeholders.includes(dbQ[c])) {
        const val = bestMatch[c];
        if (val && !placeholders.includes(val)) {
          update[c] = val;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      console.log(`⚠️  Valeur manquante dans DOCX (${bestScore.toFixed(2)}): ${dbQ.text.slice(0,70)}`);
      skipped++; continue;
    }

    await (prisma as any).question.update({ where: { id: dbQ.id }, data: update });
    fixed++;
    const preview = Object.entries(update).map(([k,v]) => `${k}="${String(v).slice(0,50)}"`).join(' | ');
    console.log(`✅ [${bestScore.toFixed(2)}] ${preview}`);
  }

  console.log(`\nTerminé: ${fixed} corrigées, ${skipped} ignorées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
