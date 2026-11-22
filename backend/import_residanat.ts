/**
 * Import du contenu Résidanat (target RESIDENT, langue FR).
 * Entrée : payload JSON produit par l'analyse des 115 fichiers Word (3 modules → sous-thèmes → QCM).
 *   - QCM « OK » et « corrigés » : isActive = true
 *   - QCM « à vérifier » : isActive = false (invisibles pour les étudiants, à corriger puis réactiver dans l'admin)
 * Sécurité : additif uniquement ; refuse de tourner si du contenu RESIDENT existe déjà.
 * Usage : npx ts-node import_residanat.ts <payload.json> [--dry-run]
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Q = { text: string; A: string; B: string; C: string; D: string; E: string; answer: string; explanation: string; active: boolean; order: number };
type Sub = { name: string; order: number; questions: Q[] };
type Mod = { name: string; order: number; subs: Sub[] };

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) throw new Error('Chemin du payload manquant');
  const mods: Mod[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  const nQ = mods.reduce((a, m) => a + m.subs.reduce((b, s) => b + s.questions.length, 0), 0);
  const nActive = mods.reduce((a, m) => a + m.subs.reduce((b, s) => b + s.questions.filter((q) => q.active).length, 0), 0);
  console.log(`Payload : ${mods.length} modules, ${mods.reduce((a, m) => a + m.subs.length, 0)} sous-thèmes, ${nQ} QCM (${nActive} actifs, ${nQ - nActive} désactivés)`);

  // Validation stricte avant toute écriture
  for (const m of mods) for (const s of m.subs) for (const q of s.questions) {
    if (!q.text || !q.A || !q.B || !q.C || !q.D || !q.E) throw new Error(`QCM incomplet dans ${s.name}`);
    if (!/^[A-E](,[A-E])*$/.test(q.answer)) throw new Error(`Réponse invalide « ${q.answer} » dans ${s.name}`);
  }

  const existing = await prisma.theme.count({ where: { target: 'RESIDENT' } });
  if (existing > 0) throw new Error(`${existing} thème(s) RESIDENT existent déjà — import annulé (aucune écriture).`);
  if (dryRun) { console.log('Dry-run OK, aucune écriture.'); return; }

  for (const m of mods) {
    const theme = await prisma.theme.create({
      data: { name: m.name, language: 'FR', target: 'RESIDENT', order: m.order, isPublished: true },
    });
    for (const s of m.subs) {
      const sub = await prisma.subTheme.create({ data: { name: s.name, order: s.order, themeId: theme.id } });
      for (let i = 0; i < s.questions.length; i += 200) {
        await prisma.question.createMany({
          data: s.questions.slice(i, i + 200).map((q) => ({
            text: q.text, choiceA: q.A, choiceB: q.B, choiceC: q.C, choiceD: q.D, choiceE: q.E,
            correctAnswer: q.answer, explanation: q.explanation, order: q.order, isActive: q.active, subThemeId: sub.id,
          })),
        });
      }
    }
    console.log(`✓ ${m.name} : ${m.subs.length} sous-thèmes`);
  }

  // Tarifs Résidanat : initialisés avec les tarifs actuels, uniquement s'ils n'existent pas encore
  for (const key of ['PRICE_1M', 'PRICE_CONCOURS', 'PRICE_GROUP_PER_PERSON', 'GROUP_MIN_MEMBERS']) {
    const resKey = `RES_${key}`;
    const has = await prisma.setting.findUnique({ where: { key: resKey } });
    if (has) continue;
    const cur = await prisma.setting.findUnique({ where: { key } });
    if (cur) {
      await prisma.setting.create({ data: { key: resKey, value: cur.value } });
      console.log(`Réglage ${resKey} = ${cur.value} (copié de ${key})`);
    }
  }

  const check = await prisma.question.groupBy({
    by: ['isActive'], where: { subTheme: { theme: { target: 'RESIDENT' } } }, _count: { _all: true },
  });
  console.log('Vérification en base :', check.map((c) => `${c.isActive ? 'actives' : 'désactivées'}=${c._count._all}`).join(', '));
}

main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
