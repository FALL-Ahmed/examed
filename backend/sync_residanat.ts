/**
 * Mise à jour du contenu Résidanat (target RESIDENT) à partir d'un nouveau payload.
 * Pour chaque sous-thème : si le contenu diffère, ses questions sont remplacées ; sinon il n'est pas touché.
 * Sécurité : refuse de remplacer des questions auxquelles des utilisateurs ont déjà répondu ou mises en favori.
 * Usage : npx ts-node --transpile-only sync_residanat.ts <payload.json> [--dry-run]
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
type Q = { text: string; A: string; B: string; C: string; D: string; E: string; answer: string; explanation: string; active: boolean; order: number };
type Sub = { name: string; order: number; questions: Q[] };
type Mod = { name: string; order: number; subs: Sub[] };

const fp = (qs: { text: string; choiceA: string; choiceB: string; choiceC: string; choiceD: string; choiceE: string; correctAnswer: string; explanation: string; isActive: boolean }[]) =>
  qs.map((q) => [q.text, q.choiceA, q.choiceB, q.choiceC, q.choiceD, q.choiceE, q.correctAnswer, q.explanation, q.isActive].join('¦')).join('\n');

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes('--dry-run');
  const mods: Mod[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  const used = await prisma.userAnswer.count({ where: { question: { subTheme: { theme: { target: 'RESIDENT' } } } } });
  const favs = await prisma.favorite.count({ where: { question: { subTheme: { theme: { target: 'RESIDENT' } } } } });
  console.log(`Réponses d'utilisateurs sur le contenu Résidanat : ${used} · favoris : ${favs}`);
  if ((used > 0 || favs > 0) && !dry) throw new Error('Des utilisateurs ont déjà utilisé ce contenu — remplacement annulé (aucune écriture).');

  let changed = 0, created = 0, same = 0, nq = 0;
  for (const m of mods) {
    const theme = await prisma.theme.findUnique({ where: { name_language_target: { name: m.name, language: 'FR', target: 'RESIDENT' } } });
    if (!theme) throw new Error(`Thème introuvable : ${m.name}`);
    for (const s of m.subs) {
      const data = s.questions.map((q) => ({ text: q.text, choiceA: q.A, choiceB: q.B, choiceC: q.C, choiceD: q.D, choiceE: q.E, correctAnswer: q.answer, explanation: q.explanation, order: q.order, isActive: q.active }));
      nq += data.length;
      const sub = await prisma.subTheme.findUnique({ where: { themeId_name: { themeId: theme.id, name: s.name } } });
      if (!sub) {
        console.log(`+ nouveau sous-thème « ${s.name} » (${data.length} QCM)`);
        created++;
        if (!dry) {
          const ns = await prisma.subTheme.create({ data: { name: s.name, order: s.order, themeId: theme.id } });
          await prisma.question.createMany({ data: data.map((q) => ({ ...q, subThemeId: ns.id })) });
        }
        continue;
      }
      const cur = await prisma.question.findMany({ where: { subThemeId: sub.id }, orderBy: { order: 'asc' },
        select: { text: true, choiceA: true, choiceB: true, choiceC: true, choiceD: true, choiceE: true, correctAnswer: true, explanation: true, isActive: true } });
      const neu = data.map((q) => ({ ...q, isActive: q.isActive }));
      if (fp(cur) === fp(neu)) { same++; if (sub.order !== s.order && !dry) await prisma.subTheme.update({ where: { id: sub.id }, data: { order: s.order } }); continue; }
      console.log(`~ « ${s.name} » : ${cur.length} → ${data.length} QCM (${cur.filter((q) => q.isActive).length} → ${data.filter((q) => q.isActive).length} actives)`);
      changed++;
      if (!dry) {
        await prisma.$transaction([
          prisma.question.deleteMany({ where: { subThemeId: sub.id } }),
          prisma.question.createMany({ data: data.map((q) => ({ ...q, subThemeId: sub.id })) }),
          prisma.subTheme.update({ where: { id: sub.id }, data: { order: s.order } }),
        ]);
      }
    }
  }
  console.log(`\nBilan : ${changed} sous-thèmes mis à jour, ${created} créés, ${same} inchangés — ${nq} QCM dans le payload${dry ? ' (dry-run, aucune écriture)' : ''}`);
  if (!dry) {
    const check = await prisma.question.groupBy({ by: ['isActive'], where: { subTheme: { theme: { target: 'RESIDENT' } } }, _count: { _all: true } });
    console.log('Vérification en base :', check.map((c) => `${c.isActive ? 'actives' : 'désactivées'}=${c._count._all}`).join(', '));
  }
}

main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
