/**
 * import_ar_reuni.js
 * Réorganise guide_arabe_reuni.json en 9 catégories propres et importe en DB
 */
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const data = require('./guide_arabe_reuni.json');

// ── Sous-thèmes identifiants pour chaque catégorie cible ──────────────────
// Clé = fragment du nom de sous-thème, valeur = catégorie cible
const SUBTHEME_TO_CATEGORY = [
  // الدوائية — EN PREMIER pour éviter conflits (مضادات ارتفاع ضغط الدم vs ارتفاع ضغط الدم)
  { keys: ['مسكنات الألم', 'مضادات الالتهاب', 'المضادات الحيوية', 'مضادات التخثر',
            'مضادات ارتفاع ضغط الدم', 'مدرات البول', 'الملينات'], cat: 'الدوائية والعلاج' },

  // طب القلب
  { keys: ['الانصمام الرئوي', 'ارتفاع ضغط الدم', 'قصور في القلب', 'جلطة الأوردة العميقة'], cat: 'طب القلب والأوعية الدموية' },

  // أمراض الجهاز الهضمي
  { keys: ['الإسهال الحاد', 'النزيف الهضمي', 'التهاب الكبد الحاد', 'اليرقان',
            'انسداد الأمعاء', 'التهاب البنكرياس', 'التهاب الصفاق الحاد', 'قرحة المعدة'], cat: 'أمراض الجهاز الهضمي' },

  // الجراحة العامة
  { keys: ['التهاب المفاصل العظمي', 'الكسور', 'عدوى الأنسجة الرخوة', 'الحروق'], cat: 'الجراحة العامة والإسعافات' },

  // السيميولوجيا
  { keys: ['سيميولوجيا'], cat: 'السيميولوجيا' },
];

function getCategoryForSubtheme(nom) {
  for (const { keys, cat } of SUBTHEME_TO_CATEGORY) {
    if (keys.some(k => nom.includes(k))) return cat;
  }
  return 'الممارسة التمريضية'; // défaut: nursing procedures
}

// ── Construire la structure finale ────────────────────────────────────────
const catMap = new Map();

// Catégories 1, 2, 3 gardées telles quelles
for (const cat of data.categories.slice(0, 3)) {
  catMap.set(cat.nom, { nom: cat.nom, themes: [...cat.themes] });
}

// Catégorie 4 redistribuée
const bigCat = data.categories[3];
for (const theme of bigCat.themes) {
  if (theme.questions.length === 0) continue;
  const catName = getCategoryForSubtheme(theme.nom);
  if (!catMap.has(catName)) catMap.set(catName, { nom: catName, themes: [] });
  catMap.get(catName).themes.push(theme);
}

const ORDERED_CATS = [
  'أَمْراض الرِّئَة   (Pneumologie)',
  'الأمراض المعدية (Maladies Infectieuses)',
  'التشريح وعلم وظائف الأعضاء (Anatomie et Physiologie)',
  'طب القلب والأوعية الدموية',
  'أمراض الجهاز الهضمي',
  'الجراحة العامة والإسعافات',
  'الدوائية والعلاج',
  'السيميولوجيا',
  'الممارسة التمريضية',
];

const finalCategories = [];
for (const name of ORDERED_CATS) {
  // cherche dans catMap (correspondance exacte ou partielle)
  let found = catMap.get(name);
  if (!found) {
    // cherche partielle
    for (const [k, v] of catMap) {
      if (k.includes(name) || name.includes(k.split(' ')[0])) { found = v; break; }
    }
  }
  if (found) {
    const q = found.themes.reduce((s, t) => s + t.questions.length, 0);
    if (q > 0) finalCategories.push({ nom: name, themes: found.themes });
  }
}

// Stats
console.log('=== Structure finale ===');
let total = 0;
for (const cat of finalCategories) {
  const q = cat.themes.reduce((s, t) => s + t.questions.length, 0);
  total += q;
  console.log(`[${q}q] ${cat.nom}`);
  for (const t of cat.themes) {
    if (t.questions.length > 0) console.log(`   └─ [${t.questions.length}q] ${t.nom}`);
  }
}
console.log(`TOTAL: ${total} questions\n`);

// ── Import en base ───────────────────────────────────────────────────────────
async function main() {
  console.log('🗑️  Suppression des anciennes données AR...');
  const arSubThemes = await prisma.subTheme.findMany({
    where: { theme: { language: 'AR' } },
    select: { id: true }
  });
  const arSubIds = arSubThemes.map(s => s.id);
  await prisma.question.deleteMany({ where: { subThemeId: { in: arSubIds } } });
  await prisma.subTheme.deleteMany({ where: { id: { in: arSubIds } } });
  await prisma.theme.deleteMany({ where: { language: 'AR' } });
  console.log('✅ Anciennes données AR supprimées\n');

  console.log('📥 Import des nouvelles données...');
  let qCount = 0;

  for (let catIdx = 0; catIdx < finalCategories.length; catIdx++) {
    const cat = finalCategories[catIdx];
    const qInCat = cat.themes.reduce((s, t) => s + t.questions.length, 0);
    if (qInCat === 0) continue;

    const theme = await prisma.theme.create({
      data: { name: cat.nom, language: 'AR', order: catIdx + 1 }
    });

    let subOrder = 1;
    for (const subTheme of cat.themes) {
      if (subTheme.questions.length === 0) continue;
      const sub = await prisma.subTheme.create({
        data: { name: subTheme.nom, order: subOrder++, themeId: theme.id }
      });
      for (let qIdx = 0; qIdx < subTheme.questions.length; qIdx++) {
        const q = subTheme.questions[qIdx];
        await prisma.question.create({
          data: {
            text: q.question,
            choiceA: q.options.A || '',
            choiceB: q.options.B || '',
            choiceC: q.options.C || '',
            choiceD: q.options.D || '',
            choiceE: q.options.E || '',
            correctAnswer: q.reponses.join(','),
            explanation: q.commentaire || '',
            order: qIdx + 1,
            isActive: true,
            subThemeId: sub.id,
          }
        });
        qCount++;
      }
    }
    process.stdout.write(`  ✅ ${cat.nom} — ${qInCat}q\n`);
  }

  console.log(`\n🎉 Import terminé: ${qCount} questions importées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
