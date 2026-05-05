/**
 * restructure_ar.js
 * Restructure guide_arabe_final.json pour correspondre à la structure française
 */
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('guide_arabe_final.json', 'utf-8'));

// Helper: trouver un thème par nom
function findTheme(nom) {
  for (const cat of data.categories)
    for (const th of cat.themes)
      if (th.nom === nom) return th;
  return null;
}

// Helper: extraire questions par numéros
function extractQsByNums(th, nums) {
  return th.questions.filter(q => nums.includes(q.numero));
}

// Helper: extraire questions par plage
function extractQsByRange(th, from, to) {
  return th.questions.filter(q => q.numero >= from && q.numero <= to);
}

// Helper: renumeroter questions d'un thème
function renum(qs) {
  return qs.map((q, i) => ({ ...q, numero: i + 1 }));
}

// ── Récupérer tous les thèmes actuels ──────────────────────────────────────
const th = {
  SNG:       findTheme('الأنابيب الأنفية المعدية (SNG)'),
  ESCARRES:  findTheme('تقرحات الضغط (ESCARRES)'),
  PANS:      findTheme('الضمادات (PANSEMENTS)'),
  OXY:       findTheme('العلاج بالأكسجين (OXYGENOTHERAPIE)'),
  NUTRI:     findTheme('التغذية المعوية والوريدية'),
  LAVEMENT:  findTheme('الحقنة الشرجية (LAVEMENT)'),
  INEMA:     findTheme('إينيما'),
  OCULAIRE:  findTheme('غسول العين (LAVAGE OCULAIRE)'),
  OREILLE:   findTheme('غسل الأذن (Lavage de l\'oreille)'),
  TMRG:      findTheme('التمريض'),           // 2q generique
  GIPS_BOOT: findTheme('الجصص: أحذية قدمية (Platres : bottes pedieuses)'),
  BABP1:     findTheme('أجبيرة BABP (Platres Brachio-Anté-Brachio-Palmaire)'),
  BABP2:     findTheme('جبلص براتشيو-أنتي-براكيو-بالماير (BABP)'),
  MANCH:     findTheme('أصفاد الجبس:'),
  OSSEUX:    findTheme('الأصول الثابتة المغطاة بالجبس:'),
  MAYO:      findTheme('عيادة مايو'),
  ORTHO:     findTheme('جراحة العظام'),      // 22q brûlures+infections
  HEMO:      findTheme('مزرعة الدم:'),
  CATH:      findTheme('قسطرة المسالك البولية'), // 30q
  LOMBA:     findTheme('البزل القطني'),
  PLEURAL:   findTheme('الثقب الجنبي'),
  ASCITE:    findTheme('ثقوب النوتة'),
  INTUB:     findTheme('التنبيب في القصبة الهوائية:'),
  VACCIN:    findTheme('اللقاحات'),
  INAB:      findTheme('الإناث التناسلية'),  // 12q: Q1-7 féminin, Q8-12 masculin
  GURG:      findTheme('الطوارئ الجراحية:'), // 4q appendicite
  PERIT:     findTheme('التهاب الصفاق الحاد'), // 17q mixte
  MUSC:      findTheme('جرح العضلات البيضاء'), // 4q
  OCCL:      findTheme('انسداد الأمعاء'),
  ANAT:      findTheme('التشريح وعلم وظائف الأعضاء'), // 52q
  PHYSIO:    findTheme('فسيولوجيا الجهاز التنفسي'),   // 24q
  DENG:      findTheme('الأمراض المعدية:'),
  BILHA:     findTheme('ليه شيستوسومياز (بيلهارزيوز)'),
  ROUGEOL:   findTheme('الحصبة'),
  TOXO:      findTheme('التوكسوبلازما'),
};

// ── Préparer les collections de questions ──────────────────────────────────

// Catheter: Q1-5,Q16-26 nursing | Q6-15,Q27-30 anatomy
const cathNursing = renum([
  ...extractQsByRange(th.CATH, 1, 5),
  ...extractQsByRange(th.CATH, 16, 26),
]);
const cathAnat = renum([
  ...extractQsByRange(th.CATH, 6, 15),
  ...extractQsByRange(th.CATH, 27, 30),
]);

// التشريح (52q): Q1-4+Q26-31=respira, Q5-14+Q32-41=CNS, Q15-22+Q42-52=cardio, Q23-25=masc
const anatRespira = renum([
  ...extractQsByRange(th.ANAT, 1, 4),
  ...extractQsByRange(th.ANAT, 26, 31),
]);
const anatCNS = renum([
  ...extractQsByRange(th.ANAT, 5, 14),
  ...extractQsByRange(th.ANAT, 32, 41),
]);
const anatCardio = renum([
  ...extractQsByRange(th.ANAT, 15, 22),
  ...extractQsByRange(th.ANAT, 42, 52),
]);
const anatMasc = renum([
  ...extractQsByRange(th.ANAT, 23, 25),
  ...(th.INAB ? extractQsByRange(th.INAB, 8, 12) : []),
]);

// فسيولوجيا (24q): Q1-4,Q13=respira | Q5-12,Q14-24=digestif
const physioRespira = renum([
  ...extractQsByRange(th.PHYSIO, 1, 4),
  ...extractQsByNums(th.PHYSIO, [13]),
]);
const physioDigest = renum([
  ...extractQsByRange(th.PHYSIO, 5, 12),
  ...extractQsByRange(th.PHYSIO, 14, 24),
]);

// الإناث التناسلية Q1-7 = féminin, Q7 = bassin
const anatFem = renum(th.INAB ? extractQsByRange(th.INAB, 1, 7) : []);

// التهاب الصفاق الحاد: Q1-3=péritonite, Q4-6+Q15=pancréatite, Q7-14+Q16-17=hépatite
const peritonite = renum(th.PERIT ? extractQsByRange(th.PERIT, 1, 3) : []);
const pancreatite = renum(th.PERIT ? [
  ...extractQsByRange(th.PERIT, 4, 6),
  ...extractQsByNums(th.PERIT, [15]),
] : []);
const hepatite = renum(th.PERIT ? [
  ...extractQsByRange(th.PERIT, 7, 14),
  ...extractQsByNums(th.PERIT, [16, 17]),
] : []);

// جراحة العظام (22q): Q1-9=brûlures, Q10-22=infections
const brutures = renum(th.ORTHO ? extractQsByRange(th.ORTHO, 1, 9) : []);
const infPartMolles = renum(th.ORTHO ? extractQsByRange(th.ORTHO, 10, 22) : []);

// BABP merge
const babpMerged = renum([
  ...(th.BABP1 ? th.BABP1.questions : []),
  ...(th.BABP2 ? th.BABP2.questions : []),
]);

// Lavement merge
const lavementMerged = renum([
  ...(th.LAVEMENT ? th.LAVEMENT.questions : []),
  ...(th.INEMA ? th.INEMA.questions : []),
]);

// Manchettes merge
const manchMerged = renum([
  ...(th.MANCH ? th.MANCH.questions : []),
  ...(th.OSSEUX ? th.OSSEUX.questions : []),
]);

// Nutrition merge
const nutriMerged = renum([
  ...(th.NUTRI ? th.NUTRI.questions : []),
  ...(th.TMRG ? th.TMRG.questions : []),
]);

// ── Construire la nouvelle structure ───────────────────────────────────────
const newData = { categories: [

  // 1. التمريض — SOINS INFIRMIERS
  { nom: 'التمريض', themes: [
    { nom: 'الأنابيب الأنفية المعدية (SNG)', questions: renum(th.SNG?.questions || []) },
    { nom: 'تقرحات الضغط (ESCARRES)',         questions: renum(th.ESCARRES?.questions || []) },
    { nom: 'الضمادات (PANSEMENTS)',            questions: renum(th.PANS?.questions || []) },
    { nom: 'العلاج بالأكسجين (OXYGENOTHERAPIE)', questions: renum(th.OXY?.questions || []) },
    { nom: 'التغذية المعوية والوريدية',        questions: nutriMerged },
    { nom: 'الحقنة الشرجية (LAVEMENT)',        questions: lavementMerged },
    { nom: 'غسول العين (LAVAGE OCULAIRE)',      questions: renum(th.OCULAIRE?.questions || []) },
    { nom: 'غسل الأذن (Lavage de l\'oreille)', questions: renum(th.OREILLE?.questions || []) },
  ]},

  // 2. جراحة العظام — ORTHOPEDIE
  { nom: 'جراحة العظام (ORTHOPEDIE)', themes: [
    { nom: 'الجصص: أحذية قدمية',  questions: renum(th.GIPS_BOOT?.questions || []) },
    { nom: 'أجبيرة BABP',          questions: babpMerged },
    { nom: 'أصفاد الجبس',          questions: manchMerged },
    { nom: 'عيادة مايو',           questions: renum(th.MAYO?.questions || []) },
  ]},

  // 3. دراسة الدم — HEMATOLOGIE
  { nom: 'دراسة الدم (HEMATOLOGIE)', themes: [
    { nom: 'مزرعة الدم', questions: renum(th.HEMO?.questions || []) },
  ]},

  // 4. المسالك البولية — UROLOGIE
  { nom: 'المسالك البولية (UROLOGIE)', themes: [
    { nom: 'سوند المسالك البولية', questions: cathNursing },
  ]},

  // 5. علم الأعصاب — NEUROLOGIE
  { nom: 'علم الأعصاب (NEUROLOGIE)', themes: [
    { nom: 'البزل القطني',                          questions: renum(th.LOMBA?.questions || []) },
    { nom: 'تشريح وفسيولوجيا الجهاز العصبي المركزي', questions: anatCNS },
  ]},

  // 6. الجهاز التنفسي — PNEUMOLOGIE
  { nom: 'الجهاز التنفسي (PNEUMOLOGIE)', themes: [
    { nom: 'الثقب الجنبي',                      questions: renum(th.PLEURAL?.questions || []) },
    { nom: 'تشريح وفسيولوجيا الجهاز التنفسي', questions: renum([...anatRespira, ...physioRespira]) },
  ]},

  // 7. القلب والأوعية — CARDIOLOGIE
  { nom: 'القلب والأوعية (CARDIOLOGIE)', themes: [
    { nom: 'تشريح وفسيولوجيا القلب والأوعية الدموية', questions: anatCardio },
  ]},

  // 8. الجهاز الهضمي — GASTROENTEROLOGIE
  { nom: 'الجهاز الهضمي (GASTROENTEROLOGIE)', themes: [
    { nom: 'تشريح وفسيولوجيا الجهاز الهضمي', questions: physioDigest },
  ]},

  // 9. تشريح الجهاز البولي والكلوي — UROLOGIE ET NEPHROLOGIE
  { nom: 'تشريح الجهاز البولي والكلوي', themes: [
    { nom: 'تشريح وفسيولوجيا المسالك البولية والكلى', questions: cathAnat },
  ]},

  // 10. ثقوب النوتة — Ponctions d'ascite
  { nom: 'ثقوب النوتة (Ponctions d\'ascite)', themes: [
    { nom: 'ثقوب النوتة', questions: renum(th.ASCITE?.questions || []) },
  ]},

  // 11. التخدير والإنعاش — ANESTHESIE-REANIMATION
  { nom: 'التخدير والإنعاش (ANESTHESIE-REANIMATION)', themes: [
    { nom: 'التنبيب في القصبة الهوائية', questions: renum(th.INTUB?.questions || []) },
  ]},

  // 12. الأمراض المعدية — LES MALADIES INFECTIEUSES
  { nom: 'الأمراض المعدية (LES MALADIES INFECTIEUSES)', themes: [
    { nom: 'اللقاحات', questions: renum(th.VACCIN?.questions || []) },
  ]},

  // 13. جراحة العظام - حروق وعدوى — ORTHOPEDIE - BRULURES ET INFECTIONS
  { nom: 'جراحة العظام - حروق وعدوى', themes: [
    { nom: 'الحروق',              questions: brutures },
    { nom: 'جرح العضلات البيضاء', questions: infPartMolles },
  ]},

  // 14. الطوارئ الجراحية — URGENCES CHIRURGICALES
  { nom: 'الطوارئ الجراحية (URGENCES CHIRURGICALES)', themes: [
    { nom: 'التهاب الزائدة الدودية', questions: renum(th.GURG?.questions || []) },
    { nom: 'التهاب الصفاق الحاد',    questions: peritonite },
    { nom: 'التهاب البنكرياس الحاد', questions: pancreatite },
    { nom: 'جرح العضلات البيضاء',    questions: renum(th.MUSC?.questions || []) },
    { nom: 'انسداد الأمعاء',         questions: renum(th.OCCL?.questions || []) },
    { nom: 'التهاب الكبد الحاد',     questions: hepatite },
  ]},

  // 15. التشريح — ANATOMIE
  { nom: 'التشريح (ANATOMIE)', themes: [
    { nom: 'الأعضاء التناسلية الذكرية', questions: anatMasc },
    { nom: 'الأعضاء التناسلية الأنثوية', questions: anatFem },
  ]},

  // 16. الأمراض المعدية - تكملة — LES MALADIES INFECTIEUSES - SUITE
  { nom: 'الأمراض المعدية - تكملة', themes: [
    { nom: 'حمى الضنك',                   questions: renum(th.DENG?.questions || []) },
    { nom: 'شيستوسومياز (بيلهارزيوز)',     questions: renum(th.BILHA?.questions || []) },
    { nom: 'الحصبة',                       questions: renum(th.ROUGEOL?.questions || []) },
    { nom: 'التوكسوبلازما',               questions: renum(th.TOXO?.questions || []) },
  ]},

]};

// ── Vérification ────────────────────────────────────────────────────────────
let total = 0;
console.log('=== Nouvelle structure ===');
for (const cat of newData.categories) {
  let c = 0;
  for (const th of cat.themes) c += th.questions.length;
  console.log('\n📂 [' + c + 'q] ' + cat.nom);
  for (const th of cat.themes) {
    console.log('   └─ [' + th.questions.length + 'q] ' + th.nom);
  }
  total += c;
}
console.log('\nTOTAL: ' + total + ' questions');

fs.writeFileSync('guide_arabe_final.json', JSON.stringify(newData, null, 2), 'utf-8');
console.log('✅ guide_arabe_final.json restructuré');
