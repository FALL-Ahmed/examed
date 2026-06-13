/**
 * Seed arabe complémentaire sage-femme — "complement sage femme Ar.docx"
 * target: SAGE_FEMME, lang: AR
 */
import * as mammoth from 'mammoth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DOCX_PATH = 'C:/Users/PC/Telechargement/complement sage femme Ar.docx';
const OBST_AR_ID = 'cmplyadri00afil5a3zcz7kgy'; // طبّ التوليد
const GYN_AR_ID  = 'cmply9xsc003sil5ag1pgklf1'; // أمراض النساء

interface SubThemeDef {
  themeId?: string;
  themeName?: string;
  subName: string;
}

const HEADER_MAP: Record<string, SubThemeDef> = {
  'رعاية حديثي الولادة والإنعاش (Soins Néonataux et Réanimation)':
    { themeId: OBST_AR_ID, subName: 'رعاية حديثي الولادة والإنعاش' },
  'الحبل السري (Le Cordon Ombilical)':
    { themeId: OBST_AR_ID, subName: 'الحبل السري' },
  'الحمل المتعدد (La Grossesse Gémellaire)':
    { themeId: OBST_AR_ID, subName: 'الحمل المتعدد' },
  'تحفيز المخاض ونضج عنق الرحم (Le déclenchement du travail et la maturation cervicale)':
    { themeId: OBST_AR_ID, subName: 'تحفيز المخاض ونضج عنق الرحم' },
  'المناورات في طب التوليد (Les manœuvres en obstétrique)':
    { themeId: OBST_AR_ID, subName: 'المناورات في طب التوليد' },
  'تعثر/توقف المخاض (La stagnation du travail)':
    { themeId: OBST_AR_ID, subName: 'تعثر/توقف المخاض' },
  "الجزء الأول: المخاض التجريبي (L'Épreuve utérine)":
    { themeId: OBST_AR_ID, subName: 'المخاض التجريبي' },
  'المجيئات الجنينية (Les Présentations fœtales)':
    { themeId: OBST_AR_ID, subName: 'المجيئات الجنينية' },
  'تثبيط المخاض في حالات التهديد بالولادة المبكرة (Tocolyse et MAP)':
    { themeId: OBST_AR_ID, subName: 'تثبيط المخاض في حالات التهديد بالولادة المبكرة' },
  'مستويات الخداج والوقاية (Niveaux de prématurité)':
    { themeId: OBST_AR_ID, subName: 'مستويات الخداج والوقاية' },
  'العلاج بالكورتيكوستيرويدات قبل الولادة (Corticothérapie anténatale)':
    { themeId: OBST_AR_ID, subName: 'العلاج بالكورتيكوستيرويدات قبل الولادة' },
  'الجزء السادس: تمزق الأغشية الباكر (RPM)':
    { themeId: OBST_AR_ID, subName: 'تمزق الأغشية الباكر' },
  'السائل الأمنيوسي (Le Liquide amniotique)':
    { themeId: OBST_AR_ID, subName: 'السائل الأمنيوسي' },
  'الجزء الأول: المشيمة (Le Placenta)':
    { themeId: OBST_AR_ID, subName: 'المشيمة' },
  'أمراض النساء - اللقاحات (Vaccinations)':
    { themeId: OBST_AR_ID, subName: 'أمراض النساء - اللقاحات' },
  "سرطان عنق الرحم (Cancer du Col de l'Utérus)":
    { themeId: GYN_AR_ID, subName: 'سرطان عنق الرحم' },
  'حالة سريرية (Cas clinique)':
    { themeName: 'حالة سريرية', subName: 'متابعة الحمل الطبيعي' },
  'متابعة الحمل الطبيعي (Suivi de la grossesse normale)':
    { themeName: 'حالة سريرية', subName: 'متابعة الحمل الطبيعي' },
  'مضاعفات الثلث الأول (Complications du 1er trimestre)':
    { themeName: 'حالة سريرية', subName: 'مضاعفات الثلث الأول' },
  'مضاعفات الثلث الثالث (Pathologies du 3ème trimestre)':
    { themeName: 'حالة سريرية', subName: 'مضاعفات الثلث الثالث' },
  'العمل والولادة (Travail et Accouchement)':
    { themeName: 'حالة سريرية', subName: 'العمل والولادة' },
  'النفاس والخلاص (Post-partum et Délivrance)':
    { themeName: 'حالة سريرية', subName: 'النفاس والخلاص' },
  'العدوى، التحفيز والمناورات (Infections et Manœuvres)':
    { themeName: 'حالة سريرية', subName: 'العدوى، التحفيز والمناورات' },
};

const SKIP_LINES = new Set([
  'الخيار',
  'المحتوى',
  'طب التوليد (Obstétrique)',
  'أمراض النساء(Gynécologie)',
]);

function arToLatin(s: string): string {
  return s
    .replace(/هـ/g, 'E')
    .replace(/أ/g, 'A')
    .replace(/ب/g, 'B')
    .replace(/ج/g, 'C')
    .replace(/د/g, 'D')
    .replace(/،/g, ',')
    .trim();
}

function normalizeAnswer(raw: string): string {
  const letters = [...new Set(
    arToLatin(raw).split(/[\s,]+/).map(l => l.trim()).filter(l => /^[A-E]$/.test(l))
  )];
  return letters.join(', ');
}

interface ParsedQ {
  headerKey: string;
  text: string;
  choiceA: string; choiceB: string; choiceC: string; choiceD: string; choiceE: string;
  correctAnswer: string;
  explanation: string;
}

function parseLines(lines: string[]): ParsedQ[] {
  const questions: ParsedQ[] = [];
  let currentKey = '';
  let inQ = false;
  let text = '', choiceA = '', choiceB = '', choiceC = '', choiceD = '', choiceE = '';
  let correctAnswer = '', explanation = '';

  function save() {
    if (inQ && text && correctAnswer && currentKey) {
      questions.push({ headerKey: currentKey, text, choiceA, choiceB, choiceC, choiceD, choiceE, correctAnswer, explanation });
    }
  }
  function reset() {
    inQ = false; text = ''; choiceA = ''; choiceB = ''; choiceC = ''; choiceD = ''; choiceE = '';
    correctAnswer = ''; explanation = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_LINES.has(line)) continue;
    if (HEADER_MAP[line]) { save(); reset(); currentKey = line; continue; }
    if (/^س\d+$/.test(line)) {
      save(); reset(); inQ = true;
      i++; text = lines[i] || '';
      continue;
    }
    if (!inQ) continue;
    if (line === 'أ' && lines[i + 1]) { choiceA = lines[++i]; continue; }
    if (line === 'ب' && lines[i + 1]) { choiceB = lines[++i]; continue; }
    if (line === 'ج' && lines[i + 1]) { choiceC = lines[++i]; continue; }
    if (line === 'د' && lines[i + 1]) { choiceD = lines[++i]; continue; }
    if (line === 'هـ' && lines[i + 1]) { choiceE = lines[++i]; continue; }
    if (line === 'الاستجابة الصحيحة' && lines[i + 1]) {
      correctAnswer = normalizeAnswer(lines[++i]); continue;
    }
    if ((line === 'التعليق التفصيلي' || line === 'التعليق') && lines[i + 1]) {
      explanation = lines[++i]; continue;
    }
  }
  save();
  return questions;
}

async function main() {
  console.log('📄 Extraction du docx…');
  const result = await mammoth.extractRawText({ path: DOCX_PATH });
  const lines = result.value.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`   ${lines.length} lignes extraites`);

  console.log('🔍 Parsing…');
  const parsed = parseLines(lines);
  console.log(`   ${parsed.length} questions parsées\n`);

  const bySec: Record<string, number> = {};
  for (const q of parsed) bySec[q.headerKey] = (bySec[q.headerKey] || 0) + 1;
  for (const [k, n] of Object.entries(bySec)) {
    console.log(`   ${String(n).padStart(3)}q — ${k.slice(0, 70)}`);
  }

  // Créer thème حالة سريرية AR
  console.log('\n🗂️  Thème حالة سريرية AR…');
  let casClinique = await prisma.theme.findFirst({
    where: { name: 'حالة سريرية', language: 'AR', target: 'SAGE_FEMME' },
  });
  if (!casClinique) {
    casClinique = await prisma.theme.create({
      data: { name: 'حالة سريرية', language: 'AR', target: 'SAGE_FEMME' },
    });
    console.log(`   ➕ créé (${casClinique.id})`);
  } else {
    console.log(`   ✅ existe (${casClinique.id})`);
  }

  const resolvedThemeId: Record<string, string> = { 'حالة سريرية': casClinique.id };

  // Créer sous-thèmes
  console.log('\n🗂️  Sous-thèmes…');
  const subThemeIdMap: Record<string, string> = {};
  const uniqueKeys = [...new Set(parsed.map(q => q.headerKey))];

  for (const key of uniqueKeys) {
    const def = HEADER_MAP[key];
    const themeId = def.themeId ?? resolvedThemeId[def.themeName!];
    if (!themeId) { console.warn(`   ⚠️  Pas de themeId pour: ${key}`); continue; }

    let sub = await prisma.subTheme.findFirst({ where: { themeId, name: def.subName } });
    if (!sub) {
      sub = await prisma.subTheme.create({ data: { themeId, name: def.subName } });
      console.log(`   ➕ ${def.subName}`);
    } else {
      console.log(`   ✅ ${def.subName} (existe)`);
    }
    if (!subThemeIdMap[key]) subThemeIdMap[key] = sub.id;
  }

  // Insérer questions
  console.log('\n📝 Insertion des questions…');
  let inserted = 0, skipped = 0;

  for (const q of parsed) {
    const subThemeId = subThemeIdMap[q.headerKey];
    if (!subThemeId) { skipped++; continue; }

    const exists = await prisma.question.findFirst({ where: { subThemeId, text: q.text } });
    if (exists) { skipped++; continue; }

    await prisma.question.create({
      data: {
        subThemeId,
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        choiceE: q.choiceE,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isActive: true,
      },
    });
    inserted++;
  }

  console.log(`\n✅ ${inserted} questions insérées, ${skipped} ignorées`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
