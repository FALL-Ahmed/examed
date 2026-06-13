/**
 * Seed complémentaire sage-femme — "complement sage femme.docx"
 * 193 questions, target: SAGE_FEMME, lang: fr
 */
import * as mammoth from 'mammoth';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── IDs thèmes existants ────────────────────────────────────────────────────
const OBSTETRIQUE_ID = 'cmplydydg00wvil5arywqrfz8';
const GYNECOLOGIE_ID = 'cmplydigw00q8il5aipwt3t2v';
// CAS CLINIQUE = nouveau thème à créer

// ─── Mapping header docx → {themeId ou themeName, subName, target} ──────────
// themeId = ID d'un thème existant
// themeName = nom d'un nouveau thème à créer
interface SubThemeDef {
  themeId?: string;
  themeName?: string; // si thème nouveau à créer
  subName: string;
}

const HEADER_MAP: Record<string, SubThemeDef> = {
  // ── OBSTETRIQUE ──
  'SOINS NÉONATAUX ET RÉANIMATION':
    { themeId: OBSTETRIQUE_ID, subName: 'SOINS NÉONATAUX ET RÉANIMATION' },
  'LE CORDON OMBILICAL (ANATOMIE, PATHOLOGIE ET GESTION)':
    { themeId: OBSTETRIQUE_ID, subName: 'LE CORDON OMBILICAL' },
  'LA GROSSESSE GÉMELLAIRE (BIOLOGIE, SURVEILLANCE ET ACCOUCHEMENT)':
    { themeId: OBSTETRIQUE_ID, subName: 'LA GROSSESSE GÉMELLAIRE' },
  'LE DÉCLENCHEMENT DU TRAVAIL ET LA MATURATION CERVICALE':
    { themeId: OBSTETRIQUE_ID, subName: 'LE DÉCLENCHEMENT DU TRAVAIL ET LA MATURATION CERVICALE' },
  'LES MANŒUVRES EN OBSTÉTRIQUE':
    { themeName: 'CAS CLINIQUE', subName: 'Infections, Déclenchement, Manœuvres et Tocolyse' },
  'LA STAGNATION DU TRAVAIL (DIAGNOSTIC ET CONDUITE À TENIR)':
    { themeId: OBSTETRIQUE_ID, subName: 'LA STAGNATION DU TRAVAIL' },
  'LES PRÉSENTATIONS FŒTALES':
    { themeId: OBSTETRIQUE_ID, subName: 'LES PRÉSENTATIONS FŒTALES' },
  "LA TOCOLYSE DANS LA MENACE D'ACCOUCHEMENT PRÉMATURÉ (MAP)":
    { themeId: OBSTETRIQUE_ID, subName: 'LA TOCOLYSE ET LA MAP' },
  'RUPTURE PRÉMATURÉE DES MEMBRANES (RPM)':
    { themeId: OBSTETRIQUE_ID, subName: 'RUPTURE PRÉMATURÉE DES MEMBRANES (RPM)' },
  'LE LIQUIDE AMNIOTIQUE':
    { themeId: OBSTETRIQUE_ID, subName: 'LE LIQUIDE AMNIOTIQUE' },
  'LE PLACENTA':
    { themeId: OBSTETRIQUE_ID, subName: 'LE PLACENTA' },
  'VACCINATIONS ET GROSSESSE':
    { themeId: OBSTETRIQUE_ID, subName: 'VACCINATIONS ET GROSSESSE' },
  // ── GYNECOLOGIE ──
  "PRÉVENTION DU CANCER DU COL DE L'UTÉRUS":
    { themeId: GYNECOLOGIE_ID, subName: "PRÉVENTION DU CANCER DU COL DE L'UTÉRUS" },
  // ── CAS CLINIQUE ──
  'CAS CLINIQUE':
    { themeName: 'CAS CLINIQUE', subName: 'Complications du premier trimestre' },
};

// Sous-thèmes VIDES à créer (sans questions) — thème existant
const EMPTY_SUB_OBSTETRIQUE = [
  'Epreuve utérine',
  'CORTICOTHÉRAPIE ANTÉNATALE',
];

// Sous-thèmes VIDES du nouveau thème CAS CLINIQUE
const EMPTY_SUB_CAS_CLINIQUE = [
  'Pathologies du troisième trimestre',
  'Travail et Accouchement',
  'Post-partum et Délivrance',
];

const IGNORE_LINES = new Set(['OBSTETRIQUE', '. Suivi de la grossesse normale']);

interface ParsedQuestion {
  headerKey: string;
  text: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceE: string;
  correctAnswer: string;
  explanation: string;
}

async function extractLines(filePath: string): Promise<string[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.split('\n').map(l => l.trim()).filter(Boolean);
}

function normalizeAnswers(raw: string): string {
  const letters = [...new Set(
    raw.replace(/\s+/g, ' ').split(/[,\s]+/)
      .map(l => l.trim())
      .filter(l => /^[A-E]$/.test(l))
  )];
  return letters.join(', ');
}

function parseLines(lines: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
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
    if (/^-+$/.test(line) || IGNORE_LINES.has(line)) continue;
    if (HEADER_MAP[line]) { save(); reset(); currentKey = line; continue; }
    if (/^Q\d+$/.test(line)) {
      save(); reset(); inQ = true;
      i++; text = lines[i] || '';
      continue;
    }
    if (!inQ) continue;
    if (line === 'A' && lines[i + 1]) { choiceA = lines[++i]; continue; }
    if (line === 'B' && lines[i + 1]) { choiceB = lines[++i]; continue; }
    if (line === 'C' && lines[i + 1]) { choiceC = lines[++i]; continue; }
    if (line === 'D' && lines[i + 1]) { choiceD = lines[++i]; continue; }
    if (line === 'E' && lines[i + 1]) { choiceE = lines[++i]; continue; }
    if (line === 'Réponses' && lines[i + 1]) { correctAnswer = normalizeAnswers(lines[++i]); continue; }
    if ((line === 'Commentaire détaillé' || line === 'Commentaire') && lines[i + 1]) {
      explanation = lines[++i]; continue;
    }
  }
  save();
  return questions;
}

async function main() {
  const docxPath = path.join('C:', 'Users', 'PC', 'Telechargement', 'complement sage femme.docx');

  console.log('📄 Extraction…');
  const lines = await extractLines(docxPath);
  console.log(`   ${lines.length} lignes`);

  console.log('🔍 Parsing…');
  const parsed = parseLines(lines);
  console.log(`   ${parsed.length} questions parsées`);

  // ─── 1. Créer le thème CAS CLINIQUE s'il n'existe pas ───────────────────
  console.log('\n🗂️  Thème CAS CLINIQUE…');
  let casClinique = await prisma.theme.findFirst({
    where: { name: 'CAS CLINIQUE', target: 'SAGE_FEMME' },
  });
  if (!casClinique) {
    casClinique = await prisma.theme.create({
      data: { name: 'CAS CLINIQUE', target: 'SAGE_FEMME' },
    });
    console.log('   ➕ Thème CAS CLINIQUE créé');
  } else {
    console.log('   ✅ Thème CAS CLINIQUE existe');
  }

  // Résoudre themeId pour les entrées themeName
  const resolvedThemeId: Record<string, string> = {
    'CAS CLINIQUE': casClinique.id,
  };

  // ─── 2. Créer les sous-thèmes avec questions ─────────────────────────────
  console.log('\n🗂️  Sous-thèmes avec questions…');
  const subThemeIdMap: Record<string, string> = {};

  const uniqueKeys = [...new Set(parsed.map(q => q.headerKey))];
  for (const key of uniqueKeys) {
    const def = HEADER_MAP[key];
    const themeId = def.themeId ?? resolvedThemeId[def.themeName!];

    let sub = await prisma.subTheme.findFirst({ where: { themeId, name: def.subName } });
    if (!sub) {
      sub = await prisma.subTheme.create({ data: { themeId, name: def.subName } });
      console.log(`   ➕ ${def.subName}`);
    } else {
      console.log(`   ✅ ${def.subName} (existe)`);
    }
    subThemeIdMap[key] = sub.id;
  }

  // ─── 3. Sous-thèmes vides OBSTETRIQUE ────────────────────────────────────
  console.log('\n🗂️  Sous-thèmes vides Obstetrique…');
  for (const subName of EMPTY_SUB_OBSTETRIQUE) {
    const existing = await prisma.subTheme.findFirst({ where: { themeId: OBSTETRIQUE_ID, name: subName } });
    if (!existing) {
      await prisma.subTheme.create({ data: { themeId: OBSTETRIQUE_ID, name: subName } });
      console.log(`   ➕ ${subName}`);
    } else {
      console.log(`   ✅ ${subName} (existe)`);
    }
  }

  // ─── 4. Sous-thèmes vides CAS CLINIQUE ───────────────────────────────────
  console.log('\n🗂️  Sous-thèmes vides CAS CLINIQUE…');
  for (const subName of EMPTY_SUB_CAS_CLINIQUE) {
    const existing = await prisma.subTheme.findFirst({ where: { themeId: casClinique!.id, name: subName } });
    if (!existing) {
      await prisma.subTheme.create({ data: { themeId: casClinique!.id, name: subName } });
      console.log(`   ➕ ${subName}`);
    } else {
      console.log(`   ✅ ${subName} (existe)`);
    }
  }

  // ─── 5. Insérer les questions ─────────────────────────────────────────────
  console.log('\n📝 Insertion questions…');
  let inserted = 0;
  let skipped = 0;

  for (const q of parsed) {
    const subThemeId = subThemeIdMap[q.headerKey];
    if (!subThemeId) { skipped++; continue; }

    const existing = await prisma.question.findFirst({ where: { subThemeId, text: q.text } });
    if (existing) { skipped++; continue; }

    await prisma.question.create({
      data: {
        subThemeId,
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC,
        choiceD: q.choiceD,
        choiceE: q.choiceE || '',
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
