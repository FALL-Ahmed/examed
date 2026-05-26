import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const BOT_IPS = [
  '57.141.2.17','31.13.115.114','35.87.123.183','57.141.2.5',
  '173.252.87.114','57.141.2.65','57.141.2.53','173.252.95.60',
  '18.236.106.55','173.252.82.112','173.252.127.26','57.141.2.51','31.13.115.1',
];

async function main() {
  const result = await prisma.pdfDownload.deleteMany({
    where: { ipAddress: { in: BOT_IPS } },
  });
  console.log(`Supprimé : ${result.count} entrée(s) bot.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
