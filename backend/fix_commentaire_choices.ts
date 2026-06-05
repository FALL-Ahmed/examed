import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function normalize(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  // Count common words
  const wa = new Set(na.split(' '));
  const wb = nb.split(' ');
  const common = wb.filter(w => wa.has(w)).length;
  return (2 * common) / (wa.size + wb.length);
}

async function main() {
  const raw = fs.readFileSync('C:/Users/PC/Telechargement/sage_femme_correction.json', 'utf-8');
  const json = JSON.parse(raw);

  // Flatten all questions from JSON
  const jsonQuestions: any[] = [];
  for (const theme of json.themes || []) {
    for (const sub of theme.subThemes || []) {
      for (const q of sub.questions || []) {
        jsonQuestions.push({ ...q, _theme: theme.name, _sub: sub.name });
      }
    }
  }
  console.log(`JSON: ${jsonQuestions.length} questions`);

  // Get DB questions with "Commentaire" in any choice
  const choices = ['choiceA','choiceB','choiceC','choiceD','choiceE'] as const;
  const dbQuestions = await (prisma as any).question.findMany({
    where: { OR: choices.map(c => ({ [c]: { in: ['Commentaire','Comment','commentaire'] } })) },
  });
  console.log(`DB: ${dbQuestions.length} questions à corriger\n`);

  let fixed = 0, skipped = 0;

  for (const dbQ of dbQuestions) {
    // Find best match in JSON
    let bestMatch: any = null, bestScore = 0;
    for (const jQ of jsonQuestions) {
      const score = similarity(dbQ.text, jQ.text);
      if (score > bestScore) { bestScore = score; bestMatch = jQ; }
    }

    if (!bestMatch || bestScore < 0.5) {
      console.log(`⚠️  PAS DE MATCH (score=${bestScore.toFixed(2)}): ${dbQ.text.slice(0, 60)}`);
      skipped++;
      continue;
    }

    // Build update: only replace "Commentaire" fields with the JSON value
    const update: any = {};
    for (const c of choices) {
      if (['Commentaire','Comment','commentaire'].includes(dbQ[c])) {
        const jsonVal = bestMatch[c];
        if (jsonVal && !['Commentaire','Comment','commentaire'].includes(jsonVal)) {
          update[c] = jsonVal;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      console.log(`⚠️  Rien à corriger pour: ${dbQ.text.slice(0, 60)}`);
      skipped++;
      continue;
    }

    await (prisma as any).question.update({ where: { id: dbQ.id }, data: update });
    fixed++;
    const fields = Object.entries(update).map(([k,v]) => `${k}="${String(v).slice(0,40)}"`).join(', ');
    console.log(`✅ [score=${bestScore.toFixed(2)}] ${fields}`);
  }

  console.log(`\nTerminé: ${fixed} corrigées, ${skipped} ignorées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
