/**
 * Restructuration des chapitres Résidanat pour coller aux fichiers du fournisseur (30 / 49 / 36 chapitres) :
 *  - « Septicémie et choc septique » : les 100 QCM du fichier 33 (rangés jusqu'ici dans « États de choc ») deviennent un chapitre
 *  - « Arthrites septiques » : les fichiers 1 et 19 ne sont plus fusionnés → « série 1 » (fichier 1) et « série 2 » (fichier 19)
 * Chaque question est retrouvée de façon unique (énoncé, + propositions A/B pour les arthrites) ; sinon rien n'est écrit.
 * Usage : npx ts-node --transpile-only restructure_residanat.ts <restructure.json> [--dry-run]
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

async function themeOf(name: string) {
  const t = await prisma.theme.findUnique({ where: { name_language_target: { name, language: 'FR', target: 'RESIDENT' } }, include: { subThemes: { orderBy: { order: 'asc' } } } });
  if (!t) throw new Error(`Thème introuvable : ${name}`);
  return t;
}

async function split(opts: { module: string; from: string; name: string; after: string; rename?: string; match: (q: { text: string; choiceA: string; choiceB: string }) => number | null; count: number }, dry: boolean) {
  const theme = await themeOf(opts.module);
  if (theme.subThemes.some((s) => s.name === opts.name)) { console.log(`« ${opts.name} » existe déjà — ignoré`); return; }
  const src = theme.subThemes.find((s) => s.name === opts.from);
  const after = theme.subThemes.find((s) => s.name === opts.after);
  if (!src || !after) throw new Error(`Sous-thème introuvable (${opts.from} / ${opts.after})`);
  const qs = await prisma.question.findMany({ where: { subThemeId: src.id }, orderBy: { order: 'asc' }, select: { id: true, text: true, choiceA: true, choiceB: true, order: true } });
  const picked = new Map<number, string>(); // index dans la liste du fichier → id question
  for (const q of qs) {
    const idx = opts.match(q);
    if (idx === null) continue;
    if (picked.has(idx)) throw new Error(`Correspondance ambiguë pour la question n°${idx + 1} du fichier`);
    picked.set(idx, q.id);
  }
  if (picked.size !== opts.count) throw new Error(`« ${opts.name} » : ${picked.size} questions retrouvées sur ${opts.count} attendues — rien n'est écrit`);
  const movedIds = new Set(picked.values());
  const rest = qs.filter((q) => !movedIds.has(q.id));
  console.log(`« ${opts.from} » : ${qs.length} QCM → ${rest.length} restent ; ${picked.size} vont dans « ${opts.name} » (après « ${opts.after} »)${opts.rename ? ` ; « ${opts.from} » renommé « ${opts.rename} »` : ''}`);
  if (dry) return;
  const shift = theme.subThemes.filter((s) => s.order > after.order).reverse();
  await prisma.$transaction(async (tx) => {
    for (const s of shift) await tx.subTheme.update({ where: { id: s.id }, data: { order: s.order + 1 } });
    const sub = await tx.subTheme.create({ data: { name: opts.name, order: after.order + 1, themeId: theme.id } });
    for (const [idx, id] of [...picked.entries()].sort((a, b) => a[0] - b[0])) await tx.question.update({ where: { id }, data: { subThemeId: sub.id, order: idx + 1 } });
    for (let i = 0; i < rest.length; i++) await tx.question.update({ where: { id: rest[i].id }, data: { order: i + 1 } });
    if (opts.rename) await tx.subTheme.update({ where: { id: src.id }, data: { name: opts.rename } });
  }, { timeout: 120000 });
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const used = await prisma.userAnswer.count({ where: { question: { subTheme: { theme: { target: 'RESIDENT' } } } } });
  console.log(`Réponses d'utilisateurs sur le contenu Résidanat : ${used}`);

  const sepStems: string[] = r.septicemie.stems.map(norm);
  const sepIdx = new Map(sepStems.map((s, i) => [s, i]));
  await split({ module: r.septicemie.module, from: r.septicemie.from, name: r.septicemie.name, after: r.septicemie.after, count: sepStems.length,
    match: (q) => sepIdx.get(norm(q.text)) ?? null }, dry);

  const artKeys: string[] = r.arthrites.keys.map((k: string[]) => k.map(norm).join('¦'));
  const artIdx = new Map(artKeys.map((k, i) => [k, i]));
  await split({ module: r.arthrites.module, from: r.arthrites.from, name: r.arthrites.name, after: r.arthrites.after, rename: r.arthrites.rename_from, count: artKeys.length,
    match: (q) => artIdx.get([q.text, q.choiceA, q.choiceB].map(norm).join('¦')) ?? null }, dry);

  if (!dry) {
    for (const mod of ['Sciences fondamentales', 'Pathologie médicale', 'Pathologie chirurgicale']) {
      const t = await themeOf(mod);
      const orders = t.subThemes.map((s) => s.order);
      console.log(`${mod} : ${t.subThemes.length} chapitres${new Set(orders).size !== orders.length ? ' — ATTENTION rangs en double' : ''}`);
    }
  }
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
