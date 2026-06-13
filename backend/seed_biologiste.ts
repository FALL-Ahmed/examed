/**
 * Parser + Seed pour "Guide du TECHNICIEN Biologiste"
 * Format: thème → sous-thème → numéro → question → A/B/C/D/E → Réponses → lettre(s) → Commentaire → explication
 * Target: BIOLOGISTE, Language: FR
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Définition manuelle des thèmes/sous-thèmes (ordre du document) ──────────
const THEME_STRUCTURE: { theme: string; subs: string[] }[] = [
  {
    theme: 'PROCÉDURES GÉNÉRALES DE LABORATOIRE',
    subs: [
      'UTILISATION DU MICROSCOPE',
      'PESÉE (UTILISATION DES BALANCES)',
      'CENTRIFUGATION',
      'MESURE ET DISTRIBUTION DES LIQUIDES',
      'HYGIÈNE ET SÉCURITÉ AU LABORATOIRE',
    ],
  },
  {
    theme: 'PARASITOLOGIE',
    subs: [
      // Noms réels du document (après l'en-tête PARASITOLOGIE :)
      'GÉNÉRALITÉS',                                      // fallback pour "Généralité et examen des selles:"
      'HELMINTHES INTESTINAUX (ŒUFS ET ADULTES)',
      'TECHNIQUES DE CONCENTRATION ET EXAMENS SPÉCIAUX', // déplacé de PROCÉDURES ici
      'PARASITES DU SANG, DE LA PEAU ET DES URINES',
    ],
  },
  {
    theme: 'BACTÉRIOLOGIE',
    subs: [
      'GÉNÉRALITÉS',                                      // fallback pour le début de la section
      'GÉNÉRALITÉS, PRÉLÈVEMENTS ET COLORATIONS DE BASE',
      'DIAGNOSTIC DE LA TUBERCULOSE ET DE LA LÈPRE',
      'INFECTIONS GÉNITALES ET MALADIES VÉNÉRIENNES',
      'COPROCULTURE ET PATHOGÈNES ÉPIDÉMIQUES',
      'EXAMEN CYTO-BACTÉRIOLOGIQUE DES URINES (ECBU) ET DU LCR',
      'HÉMOCULTURE ET SÉROLOGIE',
      'ANTIBIOGRAMME ET RÉSISTANCES BACTÉRIENNES',
      'PATHOGÈNES SPÉCIFIQUES (DIPHTÉRIE, CHARBON, ANTHRAX)',
      'ANALYSE DES LIQUIDES ET MILIEUX SPÉCIAUX',
      'VACCINS ET PRÉVENTION BACTÉRIENNE',
    ],
  },
  {
    theme: 'HÉMATOLOGIE',
    subs: [
      'GÉNÉRALITÉS ET PRÉLÈVEMENTS',
      'CELLULES SANGUINES ET NUMÉRATION',
      'HÉMOGLOBINE ET CONSTANTES',
      'MORPHOLOGIE ET ANOMALIES DES HÉMATIES',
      'DRÉPANOCYTOSE ET RÉTICULOCYTES',
      'HÉMOSTASE ET COAGULATION',
      'IMMUNO-HÉMATOLOGIE ET TRANSFUSION',
      'LE PRÉLÈVEMENT SANGUIN',
      'QUALIFICATION BIOLOGIQUE DU DON',
      'PRÉPARATION DES PRODUITS SANGUINS LABILES (PSL)',
      'TESTS DE COMPATIBILITÉ ET DÉLIVRANCE',
      'ACCIDENTS DE LA TRANSFUSION SANGUINE',
      'CONTRÔLE QUALITÉ ET THÉRAPEUTIQUE',
    ],
  },
  {
    theme: 'IMMUNOLOGIE ET SÉROLOGIE',
    subs: [
      "INTRODUCTION À L'IMMUNOLOGIE ET AUX ANTICORPS",
      'TESTS SÉROLOGIQUES (AGGLUTINATION ET PRÉCIPITATION)',
      'GROUPES SANGUINS ET TRANSFUSION (SÉROLOGIE ÉRYTHROCYTAIRE)',
      'TESTS DE GROSSESSE ET RÉACTIFS SPÉCIAUX',
      'VACCINS ET IMMUNISATION',
    ],
  },
  {
    theme: 'BIOCHIMIE',
    subs: [
      'GÉNÉRALITÉS ET CONDITIONS DE PRÉLÈVEMENT',
      'MÉTABOLISME DES GLUCIDES (GLUCOSE)',
      'FONCTION RÉNALE (URÉE, CRÉATININE, ACIDE URIQUE)',
      'BILAN LIPIDIQUE (CHOLESTÉROL ET TRIGLYCÉRIDES)',
      'BILAN HÉPATIQUE ET BILIRUBINE',
      'PROTÉINES ET ALBUMINE',
      'ÉLECTROLYTES ET ÉLÉMENTS MINÉRAUX',
      'ENZYMOLOGIE CLINIQUE',
      'ANALYSES QUALITATIVES DES URINES',
      'CALCULS ET UNITÉS (SYSTÈME INTERNATIONAL)',
    ],
  },
];

// Normalise un titre pour la comparaison
function norm(s: string): string {
  return s.trim()
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Construit un index normalisé pour lookup rapide
const THEME_MAP = new Map<string, string>();   // norm → nom officiel
const SUB_MAP   = new Map<string, string>();   // norm → nom officiel
for (const t of THEME_STRUCTURE) {
  THEME_MAP.set(norm(t.theme), t.theme);
  for (const s of t.subs) SUB_MAP.set(norm(s), s);
}

// ── Parser ───────────────────────────────────────────────────────────────────

interface ParsedQuestion {
  theme: string;
  subTheme: string;
  text: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceE: string;
  correctAnswer: string;
  explanation: string;
}

function parse(filePath: string): ParsedQuestion[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Word exporte avec \r seul + format tableau (tabulation entre numéro/lettre et contenu)
  // On split chaque ligne sur les tabs pour obtenir des "cellules" séparées
  const lines: string[] = [];
  for (const rawLine of raw.split(/\r\n|\r|\n/)) {
    if (rawLine.includes('\t')) {
      for (const part of rawLine.split('\t')) {
        lines.push(part.replace(/[\x00-\x09\x0b-\x1f\x7f]/g, '').trim());
      }
    } else {
      lines.push(rawLine.replace(/[\x00-\x09\x0b-\x1f\x7f]/g, '').trim());
    }
  }

  const questions: ParsedQuestion[] = [];
  let currentTheme = '';
  let currentSub = '';

  // États de parsing d'une question
  let inQuestion = false;
  let qText = '';
  let choices: Record<string, string> = {};
  let currentChoice: string | null = null;
  let waitingAnswer = false;
  let waitingExpl = false;
  let explanation = '';
  let correctAnswer = '';

  function saveQuestion() {
    if (!qText || !correctAnswer) return;
    questions.push({
      theme: currentTheme || 'PROCÉDURES GÉNÉRALES DE LABORATOIRE',
      subTheme: currentSub || 'GÉNÉRALITÉS',
      text: qText.trim(),
      choiceA: (choices['A'] || '').trim(),
      choiceB: (choices['B'] || '').trim(),
      choiceC: (choices['C'] || '').trim(),
      choiceD: (choices['D'] || '').trim(),
      choiceE: (choices['E'] || '').trim(),
      correctAnswer,
      explanation: explanation.trim(),
    });
  }

  function resetQuestion() {
    inQuestion = false;
    qText = '';
    choices = {};
    currentChoice = null;
    waitingAnswer = false;
    waitingExpl = false;
    explanation = '';
    correctAnswer = '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (currentChoice) currentChoice = null;  // fin d'un choix
      continue;
    }

    // ── Détection thème/sous-thème ─────────────────────────────────────────
    const n = norm(line);
    if (THEME_MAP.has(n)) {
      if (inQuestion) { saveQuestion(); resetQuestion(); }
      currentTheme = THEME_MAP.get(n)!;
      currentSub = '';
      continue;
    }
    if (SUB_MAP.has(n)) {
      if (inQuestion) { saveQuestion(); resetQuestion(); }
      currentSub = SUB_MAP.get(n)!;
      continue;
    }

    // ── Numéro de question (01, 02 ... 99) ────────────────────────────────
    if (/^\d{1,3}$/.test(line)) {
      if (inQuestion) { saveQuestion(); resetQuestion(); }
      inQuestion = true;
      continue;
    }

    if (!inQuestion) continue;

    // ── Réponses : "Réponses" seul OU "RéponsesA, B, C" inline ──────────────
    const repMatch = line.match(/^R.{0,5}ponses?\s*([A-E][\s,;A-E]*)?$/i);
    if (repMatch) {
      const inlinePart = repMatch[1];
      if (inlinePart) {
        correctAnswer = [...inlinePart.toUpperCase().matchAll(/[A-E]/g)].map(m => m[0]).join(',');
        waitingAnswer = false;
      } else {
        waitingAnswer = true;
      }
      currentChoice = null;
      continue;
    }

    // ── Lettres de réponse ─────────────────────────────────────────────────
    if (waitingAnswer && /^[A-E](\s*[,;]\s*[A-E])*\s*$/.test(line)) {
      correctAnswer = [...line.toUpperCase().matchAll(/[A-E]/g)].map(m => m[0]).join(',');
      waitingAnswer = false;
      continue;
    }

    // ── Commentaire / explication ─────────────────────────────────────────
    if (/^commentaire/i.test(line)) {
      waitingExpl = true;
      currentChoice = null;
      const rest = line.replace(/^commentaire\s*:?\s*/i, '').trim();
      if (rest) explanation += rest + ' ';
      continue;
    }
    if (waitingExpl) {
      // Fin explication si on arrive à un numéro ou thème
      if (/^\d{1,3}$/.test(line) || THEME_MAP.has(norm(line)) || SUB_MAP.has(norm(line))) {
        // Traiter comme nouvelle question/section
        saveQuestion(); resetQuestion();
        i--;  // retraiter cette ligne
        continue;
      }
      explanation += line + ' ';
      continue;
    }

    // ── Lettre de choix seule (A, B, C, D, E) ────────────────────────────
    if (/^[A-E]$/.test(line)) {
      currentChoice = line;
      continue;
    }

    // ── Contenu d'un choix ────────────────────────────────────────────────
    if (currentChoice) {
      choices[currentChoice] = (choices[currentChoice] || '') + (choices[currentChoice] ? ' ' : '') + line;
      continue;
    }

    // ── Texte de la question ──────────────────────────────────────────────
    if (!Object.keys(choices).length && !waitingAnswer) {
      qText += (qText ? ' ' : '') + line;
    }
  }

  // Dernière question
  if (inQuestion) saveQuestion();

  // ── Post-traitement : récupérer les questions dont les choix sont dans qText ─
  for (const q of questions) {
    if (q.choiceA) continue; // déjà OK
    const qMark = q.text.indexOf('?');
    const colonMark = q.text.indexOf(' :');

    const splitAt = qMark >= 0 ? qMark : colonMark >= 0 ? colonMark + 1 : -1;
    if (splitAt < 0) continue;

    const questionText = q.text.substring(0, splitAt + 1).trim();
    let rest = q.text.substring(splitAt + 1).trim();
    if (!rest) continue;

    // Retirer le "A " en tête s'il n'y a qu'un seul préfixe lettre
    const leadingLetter = rest.match(/^([A-E])\s+/);
    if (leadingLetter) rest = rest.substring(leadingLetter[0].length);

    // Split sur ". " suivi d'une majuscule (évite les abbréviations type "E. coli")
    // On force 5 parties en essayant différents délimiteurs
    const sentenceSplit = (text: string): string[] => {
      // Split sur ". " suivi d'une lettre capitalisée non-isolée (ex: "La", "Le", "L'", "C'", "Un", etc.)
      const parts = text.split(/\.\s+(?=[A-ZÀ-Ùa-zà-ùÀ-Ú](?:[a-zà-ù'']|$))/);
      return parts;
    };

    const parts = sentenceSplit(rest);
    if (parts.length === 5) {
      q.text    = questionText;
      q.choiceA = parts[0].trim().replace(/\.$/, '') + '.';
      q.choiceB = parts[1].trim().replace(/\.$/, '') + '.';
      q.choiceC = parts[2].trim().replace(/\.$/, '') + '.';
      q.choiceD = parts[3].trim().replace(/\.$/, '') + '.';
      q.choiceE = parts[4].trim().replace(/\.$/, '') + '.';
      continue;
    }
  }

  // ── Overrides manuels pour les 11 questions non récupérables automatiquement ─
  const MANUAL_OVERRIDES: Array<{ key: string; qA: string; qB: string; qC: string; qD: string; qE: string }> = [
    {
      key: 'diagnostic différentiel des amibes',
      qA: "E. histolytica possède un mouvement directionnel (limace).",
      qB: "E. coli possède des pseudopodes courts émis dans tous les sens (à l'aveuglette).",
      qC: "Seule E. histolytica peut contenir des hématies ingérées (forme invasive).",
      qD: "Le noyau d'E. histolytica est très visible sans coloration.",
      qE: "E. coli est généralement plus grande (20-40 µm).",
    },
    {
      key: 'différencier un œuf de Taenia',
      qA: "L'œuf de Taenia possède une coque épaisse avec des stries transversales.",
      qB: "La cellule végétale possède des contours irréguliers et bosselés.",
      qC: "L'œuf de Taenia contient 6 crochets réfringents (hexacanthe).",
      qD: "Le Lugol colore la cellule végétale en violet (amidon).",
      qE: "La cellule végétale est toujours plus petite que l'œuf.",
    },
    {
      key: 'Indice Morphologique (IM)',
      qA: "C'est la moyenne des bacilles trouvés sur tous les sites de prélèvement.",
      qB: "C'est le pourcentage de bacilles uniformément colorés en rouge (viables) sur 100 bacilles comptés.",
      qC: 'C\'est le nombre de "globies" observées par lame.',
      qD: "Il permet de suivre l'efficacité du traitement antibiotique.",
      qE: "Il se mesure uniquement sur les prélèvements de la muqueuse nasale.",
    },
    {
      key: 'traitement d’urgence de la diphérie',
      qA: "La sérothérapie (anti-toxine) pour neutraliser le poison circulant.",
      qB: "L'antibiothérapie (Pénicilline G ou Macrolides) pendant 10 jours.",
      qC: "La mise à jour des vaccins des sujets contacts.",
      qD: "L'utilisation massive de corticoïdes.",
      qE: "La chirurgie systématique de la gorge.",
    },
    {
      key: 'sélection médicale du donneur',
      qA: "Le counselling pré-don pour l'auto-exclusion.",
      qB: "L'entretien sur l'histoire médicale (questionnaire).",
      qC: "L'examen physique complet.",
      qD: "La phase d'inclusion/exclusion définitive.",
      qE: "Le test de dépistage rapide du VIH avant tout entretien.",
    },
    {
      key: 'transfusion de plasma (PFC)',
      qA: "L'anémie aiguë.",
      qB: "Le déficit sévère en facteurs de coagulation.",
      qC: "Le purpura thrombotique thrombopénique (PTT).",
      qD: "Le remplissage volémique en cas de brûlure simple.",
      qE: "L'hémorragie massive.",
    },
    {
      key: 'solution hydro-alcoölique',
      qA: "Remplace le port de gants pour le prélèvement.",
      qB: "Est recommandée avant chaque prélèvement.",
      qC: "Doit être suivie d'un lavage au savon en cas de souillure par du sang.",
      qD: "Est inefficace contre le virus de l'hépatite B.",
      qE: "Permet une désinfection cutanée rapide.",
    },
    {
      key: 'VDRL',
      qA: "C'est un test spécifique utilisant le tréponème pâle vivant.",
      qB: 'On recherche des "éagines" (anticorps non tréponémiques).',
      qC: "L'antigène utilisé est un mélange lipidique de cardiolipine, lécithine et cholestérol.",
      qD: "La réaction se manifeste par une floculation (micro-agglutination) visible au microscope.",
      qE: "Le test doit être pratiqué à une température idéale de 23 à 29 °C.",
    },
    {
      key: 'augmentation physiologique (non pathologique) de la glycémie',
      qA: "Le stress intense ou les émotions fortes.",
      qB: "L'exercice musculaire violent juste avant le prélèvement.",
      qC: "Le séjour prolongé en altitude.",
      qD: "Un jeûne prolongé de plus de 24 heures.",
      qE: "L'exposition au froid.",
    },
    {
      key: 'recherche du glucose dans les urines',
      qA: "Les oxydants forts comme l'eau de Javel ou la liqueur de Dakin.",
      qB: "La vitamine C (acide ascorbique) en forte dose.",
      qC: "La présence d'acide phényl pyruvique.",
      qD: "Un flacon de recueil mal rincé contenant du détergent.",
      qE: "L'utilisation d'urines de 24 heures sans conservateur.",
    },
    {
      key: 'Liquide Céphalo-Rachidien (glycorachie)',
      qA: "La valeur normale se situe entre 0,45 et 0,65 g/l.",
      qB: "Elle est normalement égale à 60-70% de la glycémie plasmatique.",
      qC: "Une glycorachie abaissée est un signe classique de méningite bactérienne ou tuberculeuse.",
      qD: "Elle augmente systématiquement en cas de syphilis tertiaire.",
      qE: "On utilise la méthode à l'orthotoluidine pour les dosages manuels de précision.",
    },
    {
      key: 'glycémie de g/l vers mmol/l',
      qA: "On multiplie par 5,55.",
      qB: "On divise par 10.",
      qC: "On multiplie par 0,0555.",
      qD: "On ajoute 1,2.",
      qE: "1 g/l correspond à environ 5,5 mmol/l.",
    },
  ];

  for (const q of questions) {
    if (q.choiceA && q.choiceB && q.choiceC && q.choiceD && q.choiceE) continue;
    const override = MANUAL_OVERRIDES.find(o => q.text.toLowerCase().includes(o.key.toLowerCase()));
    if (override) {
      q.choiceA = override.qA;
      q.choiceB = override.qB;
      q.choiceC = override.qC;
      q.choiceD = override.qD;
      q.choiceE = override.qE;
      const qMark = q.text.indexOf('?');
      const colonMark = q.text.indexOf(' :');
      const splitAt = qMark >= 0 ? qMark : colonMark >= 0 ? colonMark + 1 : -1;
      if (splitAt >= 0) q.text = q.text.substring(0, splitAt + 1).trim();
    }
  }

  return questions;
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const txtPath = 'C:/Users/PC/Telechargement/biologiste_guide.txt';
  console.log('📖 Parsing...');
  const questions = parse(txtPath);
  console.log(`✅ ${questions.length} questions parsées`);

  // Stats par thème
  const byTheme = new Map<string, number>();
  for (const q of questions) {
    byTheme.set(q.theme, (byTheme.get(q.theme) ?? 0) + 1);
  }
  console.log('\n📊 Par thème:');
  for (const [t, c] of byTheme) console.log(`  ${t}: ${c}`);

  // Écrire JSON pour vérification
  const jsonPath = 'C:/Users/PC/Telechargement/biologiste_questions.json';
  fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2), 'utf8');
  console.log(`\n💾 JSON écrit: ${jsonPath}`);
  console.log('\nVérifie le JSON puis relance avec --import pour insérer en DB');

  if (!process.argv.includes('--import')) return;

  console.log('\n🚀 Import en DB...');

  // Créer les thèmes et sous-thèmes
  const themeCache = new Map<string, string>();
  const subCache   = new Map<string, string>();

  for (const { theme, subs } of THEME_STRUCTURE) {
    const existing = await prisma.theme.findFirst({
      where: { name: theme, target: 'BIOLOGISTE', language: 'FR' },
    });
    const t = existing ?? await prisma.theme.create({
      data: { name: theme, target: 'BIOLOGISTE', language: 'FR', order: 0 },
    });
    themeCache.set(theme, t.id);

    for (let idx = 0; idx < subs.length; idx++) {
      const sub = subs[idx];
      const existingSub = await prisma.subTheme.findFirst({
        where: { name: sub, themeId: t.id },
      });
      const st = existingSub ?? await prisma.subTheme.create({
        data: { name: sub, themeId: t.id, order: idx },
      });
      subCache.set(`${theme}::${sub}`, st.id);
    }
  }

  console.log(`✅ ${themeCache.size} thèmes, ${subCache.size} sous-thèmes créés`);

  // Insérer les questions
  let inserted = 0, skipped = 0;
  for (const q of questions) {
    const subKey = `${q.theme}::${q.subTheme}`;
    const subThemeId = subCache.get(subKey);
    if (!subThemeId) {
      console.warn(`⚠️  Sous-thème introuvable: ${subKey}`);
      skipped++;
      continue;
    }
    if (!q.choiceA || !q.choiceB || !q.correctAnswer) {
      skipped++;
      continue;
    }
    await prisma.question.create({
      data: {
        text: q.text,
        choiceA: q.choiceA,
        choiceB: q.choiceB,
        choiceC: q.choiceC || '',
        choiceD: q.choiceD || '',
        choiceE: q.choiceE || '',
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        subThemeId,
        isActive: true,
        order: 0,
      },
    });
    inserted++;
  }

  console.log(`\n✅ ${inserted} questions insérées, ${skipped} ignorées`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
