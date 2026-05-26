import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Corriger ASCITE → الاستسقاء
  const ascite = await prisma.subTheme.findFirst({
    where: { name: 'ASCITE', theme: { language: 'AR' } },
  });
  if (ascite) {
    await prisma.subTheme.update({ where: { id: ascite.id }, data: { name: 'الاستسقاء' } });
    console.log('✅ ASCITE → الاستسقاء');
  } else {
    console.log('❌ ASCITE non trouvé');
  }

  // Chercher BABP dans les thèmes AR
  const babp = await prisma.subTheme.findFirst({
    where: { name: { contains: 'BABP' }, theme: { language: 'AR' } },
  });
  if (babp) {
    await prisma.subTheme.update({ where: { id: babp.id }, data: { name: 'جبيرة بابب (جبيرة الطرف العلوي)' } });
    console.log('✅ BABP → جبيرة بابب (جبيرة الطرف العلوي)');
  } else {
    console.log('❌ BABP non trouvé en AR');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
