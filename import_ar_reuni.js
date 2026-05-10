/**
 * import_ar_reuni.js
 * Réorganise guide_arabe_reuni.json avec la MÊME structure que le guide FR
 * FR categories: ENDOCRINOLOGIE, PEDIATRIE, NEUROLOGIE, CARDIOLOGIE,
 *                LES MALADIES INFECTIEUSES, URGENCES CHIRURGICALES,
 *                GASTROLOGIE, ORTHOPEDIE, PHARMACOLOGIE, SEMIOLOGIE,
 *                PRATIQUE DE LA SCIENCE INFIRMIERE, ANATOMIE ET PHYSIOLOGIE
 */
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const data = require('./guide_arabe_reuni.json');
const prisma = new PrismaClient();

// ── Mapping sous-thème → catégorie (ordre important: plus spécifique en premier) ──
const SUBTHEME_TO_CATEGORY = [
  // طب الأطفال (PEDIATRIE)
  { keys: ['رعاية حديثي الولادة', 'حديثي الولادة'], cat: 'طب الأطفال' },

  // علم الأعصاب (NEUROLOGIE)
  { keys: ['التشنجات', 'الصرع'], cat: 'علم الأعصاب' },

  // الغدد الصماء (ENDOCRINOLOGIE) — insuline et glycémie compris
  { keys: ['السكري', 'الأنسولين وأدوية السكري', 'مستوى السكر في الدم'], cat: 'الغدد الصماء' },

  // الدوائية (PHARMACOLOGIE) — AVANT cardio pour éviter conflit مضادات ارتفاع ضغط الدم
  { keys: ['مسكنات الألم', 'مضادات الالتهاب', 'المضادات الحيوية', 'مضادات التخثر',
            'مضادات ارتفاع ضغط الدم', 'مدرات البول', 'الملينات'], cat: 'الدوائية والعلاج' },

  // طب القلب (CARDIOLOGIE)
  { keys: ['الانصمام الرئوي', 'ارتفاع ضغط الدم', 'قصور في القلب', 'جلطة الأوردة العميقة'], cat: 'طب القلب والأوعية الدموية' },

  // الطوارئ الجراحية (URGENCES CHIRURGICALES)
  { keys: ['انسداد الأمعاء', 'التهاب البنكرياس', 'التهاب الصفاق الحاد', 'قرحة المعدة',
            'التهاب الزائدة الدودية'], cat: 'الطوارئ الجراحية' },

  // أمراض الجهاز الهضمي (GASTROLOGIE)
  { keys: ['الإسهال الحاد', 'النزيف الهضمي', 'التهاب الكبد الحاد', 'اليرقان'], cat: 'أمراض الجهاز الهضمي' },

  // جراحة العظام والحروق (ORTHOPEDIE)
  { keys: ['التهاب المفاصل العظمي', 'الكسور', 'عدوى الأنسجة الرخوة', 'الحروق'], cat: 'جراحة العظام والحروق' },

  // السيميولوجيا (SEMIOLOGIE)
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

// Catégorie 1 (Pneumologie) → dans الأمراض المعدية
// Catégorie 2 (Maladies Infectieuses) → dans الأمراض المعدية
const maladiesCat = { nom: 'الأمراض المعدية', themes: [] };
for (const cat of data.categories.slice(0, 2)) {
  for (const theme of cat.themes) {
    if (theme.questions.length > 0) maladiesCat.themes.push(theme);
  }
}
catMap.set('الأمراض المعدية', maladiesCat);

// Catégorie 3 (Anatomie) → gardée telle quelle
const anatCat = data.categories[2];
catMap.set(anatCat.nom, { nom: anatCat.nom, themes: [...anatCat.themes] });

// Catégorie 4 redistribuée
const bigCat = data.categories[3];
for (const theme of bigCat.themes) {
  if (theme.questions.length === 0) continue;
  const catName = getCategoryForSubtheme(theme.nom);
  if (!catMap.has(catName)) catMap.set(catName, { nom: catName, themes: [] });
  catMap.get(catName).themes.push(theme);
}

// Ordre des catégories (aligné sur la structure FR)
const ORDERED_CATS = [
  'الأمراض المعدية',
  anatCat.nom,
  'طب القلب والأوعية الدموية',
  'الغدد الصماء',
  'طب الأطفال',
  'علم الأعصاب',
  'أمراض الجهاز الهضمي',
  'الطوارئ الجراحية',
  'جراحة العظام والحروق',
  'الدوائية والعلاج',
  'السيميولوجيا',
  'الممارسة التمريضية',
];

const finalCategories = [];
for (const name of ORDERED_CATS) {
  let found = catMap.get(name);
  if (!found) {
    // correspondance partielle
    for (const [k, v] of catMap) {
      if (name.includes(k.split(' ')[0]) || k.includes(name.split(' ')[0])) { found = v; break; }
    }
  }
  if (found && found.themes.some(t => t.questions.length > 0)) {
    finalCategories.push({ nom: name, themes: found.themes });
  }
}

// Stats
console.log('=== Structure finale (alignée sur FR) ===');
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
