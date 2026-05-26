import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const q = await prisma.question.findFirst({
    where: { text: { contains: 'botte plâtrée. Quels sont les signes cliniques précoces' } },
  });
  if (!q) { console.log('Non trouvée'); return; }

  const explanation = `L'infirmier doit évaluer la règle des 5P :
1. Pain (Douleur) : C'est le signe le plus précoce. Elle est intense, résiste aux médicaments et s'aggrave à l'étirement passif.
2. Paresthesia (Paresthésie) : Sensations de fourmillements traduisant une souffrance nerveuse débutante.
3. Pallor (Pâleur) : La peau est tendue, luisante, et peut devenir pâle par manque de microcirculation.
4. Paralysis (Paralysie) : Incapacité à bouger les orteils (signe de gravité).
5. Pulselessness (Absence de pouls) : ATTENTION, c'est un signe tardif. Un pouls présent n'élimine pas le diagnostic.`;

  await prisma.question.update({ where: { id: q.id }, data: { explanation } });
  console.log('✅ Commentaire Q1 botte corrigé');
}

main().catch(console.error).finally(() => prisma.$disconnect());
