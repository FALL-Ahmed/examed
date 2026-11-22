/**
 * Cancer du sein (Résidanat) — Bloc 4 « Facteurs de risque » : présent dans le Word uniquement sous forme d'image,
 * retranscrit ici mot pour mot (5 QCM) et inséré entre le bloc 3 (extension) et le bloc 5 (clinique).
 * Usage : npx ts-node --transpile-only insert_sein_bloc4.ts [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const Q = [
  {
    text: 'Concernant les facteurs de risque du cancer du sein liés aux antécédents personnels et familiaux, quelles propositions sont exactes ?',
    c: ['Un antécédent personnel de cancer du sein constitue un facteur de risque.', 'Un antécédent de cancer du sein chez une parente du premier degré augmente le risque.', 'Le risque augmente avec le nombre de parentes atteintes.', 'Seuls les antécédents maternels augmentent le risque.', 'Un antécédent de cancer de l’ovaire constitue un facteur de risque.'],
    a: 'A,B,C,E',
    e: ['A. Vrai : le cours indique qu’un antécédent personnel de cancer du sein est un facteur de risque.', 'B. Vrai : un antécédent chez une parente du premier degré augmente le risque.', 'C. Vrai : le risque augmente avec le nombre de parentes atteintes.', 'D. Faux : le risque est augmenté quel que soit le côté de la parenté (maternel ou paternel).', 'E. Vrai : un antécédent de cancer de l’ovaire est un facteur de risque.'],
  },
  {
    text: 'Concernant les facteurs de risque génétiques du cancer du sein, quelles propositions sont exactes ?',
    c: ['Les mutations BRCA1 et BRCA2 augmentent le risque de cancer du sein.', 'Les mutations BRCA1 et BRCA2 sont responsables de la majorité des formes de cancer du sein.', 'Les autres gènes de prédisposition cités dans le cours incluent PALB2, CHEK2 et ATM.', 'Les formes familiales représentent environ 5 à 10 % des cancers du sein.', 'Les formes héréditaires représentent 20 à 30 % des cancers du sein.'],
    a: 'A,C,D',
    e: ['A. Vrai : les mutations BRCA1 et BRCA2 sont des facteurs de risque génétiques.', 'B. Faux : elles ne sont pas responsables de la majorité des cancers du sein.', 'C. Vrai : PALB2, CHEK2 et ATM sont mentionnés dans le cours.', 'D. Vrai : les formes familiales représentent 5 à 10 % des cas.', 'E. Faux : les formes héréditaires concernent 5 à 10 % des cas (et non 20 à 30 %).'],
  },
  {
    text: 'Concernant les facteurs de risque hormonaux et reproductifs du cancer du sein, quelles propositions sont exactes ?',
    c: ['Une ménarche précoce est un facteur de risque.', 'Une ménopause tardive est un facteur de risque.', 'Une nulliparité est un facteur de risque.', 'Une première grossesse à un âge tardif est un facteur de risque.', 'L’allaitement constitue un facteur de risque.'],
    a: 'A,B,C,D',
    e: ['A. Vrai : une ménarche précoce augmente le risque.', 'B. Vrai : une ménopause tardive augmente le risque.', 'C. Vrai : la nulliparité constitue un facteur de risque.', 'D. Vrai : une première grossesse à un âge tardif augmente le risque.', 'E. Faux : l’allaitement est un facteur protecteur selon le cours.'],
  },
  {
    text: 'Concernant les autres facteurs de risque du cancer du sein, quelles propositions sont exactes ?',
    c: ['Une exposition prolongée aux œstrogènes endogènes ou exogènes augmente le risque.', 'Un traitement hormonal de la ménopause augmente le risque.', 'Une irradiation thoracique est un facteur de risque.', 'La consommation d’alcool augmente le risque.', 'L’obésité après la ménopause est un facteur de risque.'],
    a: 'A,B,C,D,E',
    e: ['A. Vrai : l’exposition prolongée aux œstrogènes endogènes ou exogènes augmente le risque.', 'B. Vrai : le traitement hormonal de la ménopause est un facteur de risque.', 'C. Vrai : l’irradiation thoracique antérieure est un facteur de risque.', 'D. Vrai : la consommation d’alcool augmente le risque.', 'E. Vrai : l’obésité, notamment après la ménopause, est un facteur de risque.'],
  },
  {
    text: 'Concernant les facteurs protecteurs du cancer du sein, quelles propositions sont exactes ?',
    c: ['Une première grossesse à un âge jeune est un facteur protecteur.', 'L’allaitement est un facteur protecteur.', 'Une activité physique régulière est un facteur protecteur.', 'Une alimentation riche en graisses est un facteur protecteur.', 'La réduction de la consommation d’alcool est un facteur protecteur.'],
    a: 'A,B,C,E',
    e: ['A. Vrai : une première grossesse à un âge jeune est un facteur protecteur.', 'B. Vrai : l’allaitement est un facteur protecteur.', 'C. Vrai : une activité physique régulière est un facteur protecteur.', 'D. Faux : une alimentation riche en graisses n’est pas un facteur protecteur.', 'E. Vrai : la réduction de la consommation d’alcool est un facteur protecteur.'],
  },
];

async function main() {
  const dry = process.argv.includes('--dry-run');
  const sub = await prisma.subTheme.findFirst({ where: { name: 'Cancer du sein', theme: { target: 'RESIDENT' } }, include: { questions: { orderBy: { order: 'asc' }, select: { id: true, order: true, text: true } } } });
  if (!sub) throw new Error('Sous-thème « Cancer du sein » introuvable');
  if (sub.questions.some((q) => q.text.startsWith('Concernant les facteurs protecteurs du cancer du sein'))) { console.log('Bloc 4 déjà présent — rien à faire.'); return; }
  // Le bloc 4 s'insère après la dernière question du bloc 3 (extension à distance)
  const anchor = sub.questions.find((q) => q.text.startsWith('Concernant l’extension à distance du cancer du sein'));
  if (!anchor) throw new Error('Question d’ancrage (bloc 3, extension à distance) introuvable');
  const after = sub.questions.filter((q) => q.order > anchor.order);
  console.log(`Cancer du sein : ${sub.questions.length} QCM ; insertion de 5 QCM après l’ordre ${anchor.order} ; ${after.length} QCM décalés de +5`);
  if (dry) { console.log('dry-run, aucune écriture'); return; }
  await prisma.$transaction([
    ...after.map((q) => prisma.question.update({ where: { id: q.id }, data: { order: q.order + 5 } })),
    prisma.question.createMany({
      data: Q.map((q, i) => ({ text: q.text, choiceA: q.c[0], choiceB: q.c[1], choiceC: q.c[2], choiceD: q.c[3], choiceE: q.c[4], correctAnswer: q.a, explanation: q.e.join('\n'), order: anchor.order + 1 + i, isActive: true, subThemeId: sub.id })),
    }),
  ]);
  const n = await prisma.question.count({ where: { subThemeId: sub.id, isActive: true } });
  console.log('Cancer du sein : QCM actifs en base =', n);
}
main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
