import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { profession: null },
    data: { profession: 'etudiant_infirmier' },
  });
  console.log(`✅ ${result.count} utilisateurs mis à jour avec profession = 'etudiant_infirmier'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
