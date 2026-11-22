/**
 * Ajoute le chapitre « Physiologie de l'hémostase » (Résidanat, Sciences fondamentales) à partir du corrigé
 * complet reçu le 22/11/2026 (15_PHYSIOLOGIE_HEMOSTASE_CORRIGE_COMPLET.docx) : 50 QCM relus un par un.
 * Inséré juste après « Physiologie du globule rouge » ; les sous-thèmes suivants sont décalés d'un rang.
 * Usage : npx ts-node --transpile-only insert_hemostase.ts <payload_hemostase.json> [--dry-run]
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Q = { text: string; A: string; B: string; C: string; D: string; E: string; answer: string; explanation: string; active: boolean; order: number };

async function main() {
  const dry = process.argv.includes('--dry-run');
  const p: { module: string; name: string; after: string; questions: Q[] } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const q of p.questions) {
    if (!q.text || !q.A || !q.B || !q.C || !q.D || !q.E || !/^[A-E](,[A-E])*$/.test(q.answer)) throw new Error(`QCM invalide : ${q.text.slice(0, 60)}`);
  }
  const theme = await prisma.theme.findUnique({ where: { name_language_target: { name: p.module, language: 'FR', target: 'RESIDENT' } }, include: { subThemes: { orderBy: { order: 'asc' } } } });
  if (!theme) throw new Error('Thème introuvable');
  if (theme.subThemes.some((s) => s.name === p.name)) { console.log(`« ${p.name} » existe déjà — rien à faire.`); return; }
  const anchor = theme.subThemes.find((s) => s.name === p.after);
  if (!anchor) throw new Error(`Sous-thème d'ancrage introuvable : ${p.after}`);
  const shift = theme.subThemes.filter((s) => s.order > anchor.order);
  console.log(`« ${p.name} » : ${p.questions.length} QCM, inséré au rang ${anchor.order + 1} ; ${shift.length} sous-thèmes décalés`);
  if (dry) { console.log('dry-run, aucune écriture'); return; }
  await prisma.$transaction(async (tx) => {
    for (const s of shift.reverse()) await tx.subTheme.update({ where: { id: s.id }, data: { order: s.order + 1 } });
    const sub = await tx.subTheme.create({ data: { name: p.name, order: anchor.order + 1, themeId: theme.id } });
    await tx.question.createMany({ data: p.questions.map((q) => ({ text: q.text, choiceA: q.A, choiceB: q.B, choiceC: q.C, choiceD: q.D, choiceE: q.E, correctAnswer: q.answer, explanation: q.explanation, order: q.order, isActive: q.active, subThemeId: sub.id })) });
  });
  const n = await prisma.question.count({ where: { subTheme: { theme: { target: 'RESIDENT' } }, isActive: true } });
  const ns = await prisma.subTheme.count({ where: { theme: { target: 'RESIDENT' } } });
  console.log(`OK — total RESIDENT : ${n} QCM actifs, ${ns} sous-thèmes`);
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
