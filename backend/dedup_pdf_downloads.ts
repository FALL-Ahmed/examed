import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.pdfDownload.findMany({ orderBy: { downloadedAt: 'asc' } });

  const toDelete: string[] = [];
  // Pour chaque entrée, vérifier s'il existe une entrée antérieure avec même identifiant dans les 5s
  for (let i = 0; i < all.length; i++) {
    for (let j = 0; j < i; j++) {
      if (toDelete.includes(all[i].id)) break;
      const a = all[j];
      const b = all[i];
      if (a.filename !== b.filename) continue;
      const sameUser = a.userId && b.userId && a.userId === b.userId;
      const sameIp = !a.userId && !b.userId && a.ipAddress === b.ipAddress;
      if (!sameUser && !sameIp) continue;
      const diff = Math.abs(b.downloadedAt.getTime() - a.downloadedAt.getTime());
      if (diff <= 86400000) {
        toDelete.push(b.id);
      }
    }
  }

  if (toDelete.length === 0) {
    console.log('Aucun doublon trouvé.');
    return;
  }

  console.log(`Suppression de ${toDelete.length} doublon(s) : ${toDelete.join(', ')}`);
  await prisma.pdfDownload.deleteMany({ where: { id: { in: toDelete } } });
  console.log('Fait.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
