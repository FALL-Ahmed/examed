/**
 * fix_missing.ts — Utilise le parser existant pour extraire les questions
 * manquantes du PDF tome 2 et les ajouter dans guide_fusionne.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseText } from './src/pdf/text-parser';

const ROOT = path.resolve(__dirname, '..');

const pdfText = fs.readFileSync(path.join(ROOT, 'tome2_text.txt'), 'utf-8');
const jsonData = JSON.parse(fs.readFileSync(path.join(ROOT, 'guide_fusionne.json'), 'utf-8'));

// ── Étape 1 : Dédupliquer le JSON ─────────────────────────────────────────────
let dupRemoved = 0;
for (const cat of jsonData.categories) {
  for (const th of cat.themes) {
    const seen = new Map<number, any>(); // numero → meilleure version
    for (const q of th.questions) {
      const existing = seen.get(q.numero);
      if (!existing) {
        seen.set(q.numero, q);
      } else {
        // Garder la version avec le commentaire le plus long
        if ((q.commentaire || '').length > (existing.commentaire || '').length) {
          seen.set(q.numero, q);
        }
        dupRemoved++;
      }
    }
    th.questions = Array.from(seen.values()).sort((a, b) => a.numero - b.numero);
  }
}
console.log(`Doublons supprimés: ${dupRemoved}`);

// ── Parser le PDF ─────────────────────────────────────────────────────────────
const parsed = parseText(pdfText);
console.log(`PDF parsé: ${parsed.stats.themes} thèmes, ${parsed.stats.subThemes} sous-thèmes, ${parsed.stats.questions} questions`);

// Aplatir toutes les questions extraites du PDF par sous-thème
const pdfQuestionsByTheme: Record<string, any[]> = {};
for (const theme of parsed.themes) {
  for (const sub of theme.subThemes) {
    const key = normalize(sub.name || theme.name);
    if (!pdfQuestionsByTheme[key]) pdfQuestionsByTheme[key] = [];
    for (const q of sub.questions) {
      pdfQuestionsByTheme[key].push(q);
    }
  }
}

console.log('\nSous-thèmes extraits du PDF:');
for (const [k, qs] of Object.entries(pdfQuestionsByTheme)) {
  console.log(`  [${qs.length}q] ${k}`);
}

// ── Construire index global des questions JSON ────────────────────────────────
// clé = 50 premiers chars normalisés du texte → {theme, numero}
const jsonIndex = new Map<string, { theme: any; num: number }>();
for (const cat of jsonData.categories) {
  for (const th of cat.themes) {
    for (const q of th.questions) {
      jsonIndex.set(normalize(q.question).substring(0, 50), { theme: th, num: q.numero });
    }
  }
}
console.log(`\nIndex JSON: ${jsonIndex.size} questions indexées`);

// Aplatir toutes les questions PDF
const allPdfQs: Array<{ pdfQ: any; sourceName: string }> = [];
for (const theme of parsed.themes) {
  for (const sub of theme.subThemes) {
    for (const q of sub.questions) {
      allPdfQs.push({ pdfQ: q, sourceName: sub.name || theme.name });
    }
  }
}
console.log(`Questions PDF: ${allPdfQs.length}`);

// ── Comparer avec le JSON et ajouter les manquantes ───────────────────────────
let added = 0;
const report: string[] = [];
const orphans: string[] = []; // questions PDF sans thème JSON correspondant

// Pour chaque question PDF, chercher si elle existe dans le JSON
for (const { pdfQ, sourceName } of allPdfQs) {
  const normText = normalize(pdfQ.text).substring(0, 50);
  if (jsonIndex.has(normText)) continue; // déjà présente

  // Question manquante — trouver le meilleur thème JSON par nom de section PDF
  const normSource = normalize(sourceName);
  let bestTheme: any = null;
  let bestScore = 0;
  for (const cat of jsonData.categories) {
    for (const th of cat.themes) {
      const score = overlapScore(normalize(th.nom), normSource);
      if (score > bestScore) { bestScore = score; bestTheme = th; }
    }
  }

  // Si pas de match par nom source, essayer par mots-clés du texte de la question
  if (!bestTheme || bestScore < 2) {
    const normQText = normalize(pdfQ.text);
    for (const cat of jsonData.categories) {
      for (const th of cat.themes) {
        const score = overlapScore(normalize(th.nom), normQText);
        if (score > bestScore) { bestScore = score; bestTheme = th; }
      }
    }
  }

  // Filtrer les faux positifs : headers ou fragments mal parsés
  const hasOptions = pdfQ.choiceA && pdfQ.choiceB; // au moins 2 options
  const hasAnswer = pdfQ.correctAnswer && pdfQ.correctAnswer.length > 0;
  // Une vraie question médicale : contient "?" ou "quels/quelles/quelle" ou suffisamment longue
  const looksQuestion = /\?/.test(pdfQ.text) || /\b(quel|quels|quelle|quelles|comment|pourquoi|quel est|lequel|laquelle)\b/i.test(pdfQ.text) || pdfQ.text.length > 80;
  const isRealQuestion = pdfQ.text.length > 25 && hasOptions && hasAnswer && !pdfQ.text.trim().endsWith(':') && looksQuestion;
  if (!isRealQuestion || !bestTheme || bestScore < 1) {
    orphans.push(`[${sourceName}] ${pdfQ.text.substring(0, 70)}`);
    continue;
  }

  // Trouver un numéro libre dans ce thème
  const existingNums = new Set<number>(bestTheme.questions.map((q: any) => q.numero as number));
  let num = Math.max(...Array.from(existingNums)) + 1;
  while (existingNums.has(num)) num++;

  const newQ: any = {
    numero: num,
    question: pdfQ.text,
    options: {},
    reponses: (pdfQ.correctAnswer || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    commentaire: pdfQ.explanation || '',
  };
  if (pdfQ.choiceA) newQ.options.A = pdfQ.choiceA;
  if (pdfQ.choiceB) newQ.options.B = pdfQ.choiceB;
  if (pdfQ.choiceC) newQ.options.C = pdfQ.choiceC;
  if (pdfQ.choiceD) newQ.options.D = pdfQ.choiceD;
  if (pdfQ.choiceE) newQ.options.E = pdfQ.choiceE;

  bestTheme.questions.push(newQ);
  bestTheme.questions.sort((a: any, b: any) => a.numero - b.numero);
  jsonIndex.set(normText, { theme: bestTheme, num });
  added++;
  report.push(`+ ${bestTheme.nom} Q${num}: ${pdfQ.text.substring(0, 60)}...`);
}

fs.writeFileSync(path.join(ROOT, 'guide_fusionne_corrige.json'), JSON.stringify(jsonData, null, 2), 'utf-8');

console.log(`\n${added} questions ajoutées:`);
report.forEach(l => console.log('  ' + l));
if (orphans.length > 0) {
  console.log(`\n${orphans.length} questions sans thème correspondant (orphelines):`);
  orphans.forEach(l => console.log('  ? ' + l));
}
console.log('\n✅ guide_fusionne_corrige.json sauvegardé');

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s.toUpperCase()
    .replace(/[ÀÂÄÁ]/g, 'A').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÎÏÍ]/g, 'I').replace(/[ÔÖÓ]/g, 'O')
    .replace(/[ÙÛÜÚ]/g, 'U').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function overlapScore(a: string, b: string): number {
  const wa = new Set(a.split(' ').filter(w => w.length > 3));
  const wb = new Set(b.split(' ').filter(w => w.length > 3));
  let c = 0;
  for (const w of wa) if (wb.has(w)) c++;
  return c;
}
