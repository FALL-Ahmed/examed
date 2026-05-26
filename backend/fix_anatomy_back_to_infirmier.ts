import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.theme.updateMany({
    where: {
      target: 'SAGE_FEMME',
      OR: [
        { name: { contains: 'anatomie', mode: 'insensitive' } },
        { name: { contains: 'pratique', mode: 'insensitive' } },
        { name: { contains: 'الممارسة', mode: 'insensitive' } },
        { name: { contains: 'التشريح', mode: 'insensitive' } },
      ],
    },
    data: { target: 'INFIRMIER' },
  });
  console.log(`${result.count} thème(s) remis dans INFIRMIER`);

  // Vérification
  const sf = await prisma.theme.findMany({ where: { target: 'SAGE_FEMME' }, select: { name: true, language: true } });
  console.log('\nThèmes SAGE_FEMME restants:');
  sf.forEach(t => console.log(`  [${t.language}] ${t.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
