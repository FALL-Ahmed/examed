import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SAGE_FEMME_THEMES_FR = [
  'LA GROSSESSE NORMALE',
  'Principales complications de la grossesse',
  'GYNECOLOGIE',
  'Obstetrique',
];
const SAGE_FEMME_THEMES_AR = [
  'الحمل الطبيعي',
  'المضاعفات الرئيسية للحمل (Principales complications de la grossesse)',
  'أمراض النساء (Gynécologie)',
  'طبّ التوليد',
];

async function main() {
  const allNames = [...SAGE_FEMME_THEMES_FR, ...SAGE_FEMME_THEMES_AR];
  const conflicts = await prisma.theme.findMany({
    where: { name: { in: allNames } },
    select: { name: true, target: true, language: true },
  });
  if (conflicts.length === 0) {
    console.log('✅ Aucun conflit — aucun thème infirmier avec ces noms');
  } else {
    console.log('⚠️  CONFLITS TROUVÉS :');
    conflicts.forEach(t => console.log(`  - "${t.name}" (target: ${t.target}, lang: ${t.language})`));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
