/**
 * fix_json.js — Extrait les questions du PDF et ajoute les manquantes au JSON.
 */
const fs = require('fs');

const rawLines = fs.readFileSync('tome2_text.txt', 'utf-8').split('\n');
const data = JSON.parse(fs.readFileSync('guide_fusionne.json', 'utf-8'));

// ── Helpers ───────────────────────────────────────────────────────────────────
const Q_RE = /^Q\s*(\d+)\s*$/;
const OPT_RE = /^([A-E])\s+(.+)/;
const OPT_ALONE = /^([A-E])\s*$/;
const REP_MARK = /^(✓\s*)?Bonne\(s\)|^Bonnes?\s+r[ée]ponses?|^R[ée]ponses?\s+correctes?/i;
const REP_SUITE = /^r[ée]ponse\(s\)\s*$/i;
const REP_VALS = /^([A-E](?:\s*,\s*[A-E])*)\s*$/;
const COM_MARK = /^Commentaires?\s*$/i;

// Détecte une ligne d'en-tête de section : majoritairement majuscules, sans Q ni option
function isSectionHeader(line) {
  if (!line || line.length < 4) return false;
  if (Q_RE.test(line)) return false;
  if (OPT_RE.test(line) || OPT_ALONE.test(line)) return false;
  if (REP_MARK.test(line) || REP_SUITE.test(line) || REP_VALS.test(line)) return false;
  if (COM_MARK.test(line)) return false;
  // Compter lettres majuscules vs minuscules
  const letters = line.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letters.length < 3) return false;
  const uppers = line.replace(/[^A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ]/g, '').length;
  return (uppers / letters.length) >= 0.75;
}

// ── Parser ─────────────────────────────────────────────────────────────────────
const pdfSections = [];
let curSection = null;
let curQ = null;
let mode = null; // 'q'|'opts'|'rep_pending'|'rep'|'com'
let pendingOptLetter = null;

function pushQ() {
  if (!curQ || !curQ.question || !curQ.reponses.length || !curSection) return;
  curSection.questions.push(curQ);
  curQ = null;
}

function startSection(name) {
  pushQ();
  if (curSection && curSection.questions.length > 0) pdfSections.push(curSection);
  curSection = { nom: name, questions: [] };
  mode = null;
}

for (const rawLine of rawLines) {
  const line = rawLine.trim();
  if (!line) continue;

  // Nouvelle question — toujours prioritaire
  const qm = line.match(Q_RE);
  if (qm) {
    pushQ();
    curQ = { numero: parseInt(qm[1]), question: '', options: {}, reponses: [], commentaire: '' };
    mode = 'q';
    pendingOptLetter = null;
    continue;
  }

  // En-tête de section — prioritaire sauf si on attend la valeur de réponse
  if (isSectionHeader(line) && mode !== 'rep_pending' && mode !== 'rep') {
    // Exception : si on est dans les options et la ligne ressemble à un header, c'est peut-être la suite d'une option
    if (mode === 'opts' && curQ && Object.keys(curQ.options).length > 0) {
      // Vérifier si c'est vraiment une section ou une suite d'option
      // Section header → si le nombre de mots > 1 et tout en majuscules
      const words = line.split(/\s+/);
      const allCaps = words.every(w => w === w.toUpperCase() || /[^a-zA-Z]/.test(w));
      if (allCaps && words.length <= 8) {
        startSection(line);
        continue;
      }
    } else {
      startSection(line);
      continue;
    }
  }

  // Marker réponses
  if (REP_MARK.test(line)) { mode = 'rep_pending'; continue; }
  if (REP_SUITE.test(line) && mode === 'rep_pending') { mode = 'rep'; continue; }

  // Valeurs réponses
  if ((mode === 'rep' || mode === 'rep_pending') && curQ) {
    const rm = line.match(REP_VALS);
    if (rm) {
      curQ.reponses = rm[1].split(',').map(s => s.trim());
      mode = 'com_wait';
      continue;
    }
    // Pas une liste de lettres : remettre en mode normal
    mode = 'q';
  }

  // Marker commentaire
  if (COM_MARK.test(line)) { mode = 'com'; continue; }

  // Texte commentaire
  if (mode === 'com' && curQ) {
    curQ.commentaire += (curQ.commentaire ? ' ' : '') + line;
    continue;
  }

  // Options
  if (curQ && (mode === 'q' || mode === 'opts')) {
    const oa = line.match(OPT_ALONE);
    if (oa) { pendingOptLetter = oa[1]; mode = 'opts'; continue; }

    const om = line.match(OPT_RE);
    if (om) {
      if (pendingOptLetter) { curQ.options[pendingOptLetter] = ''; pendingOptLetter = null; }
      curQ.options[om[1]] = om[2].trim();
      mode = 'opts';
      continue;
    }

    if (pendingOptLetter) {
      curQ.options[pendingOptLetter] = line;
      pendingOptLetter = null;
      continue;
    }

    if (mode === 'opts') {
      const lastOpt = Object.keys(curQ.options).pop();
      if (lastOpt) { curQ.options[lastOpt] += ' ' + line; continue; }
    }
  }

  // Texte question (suite)
  if (curQ && mode === 'q') {
    curQ.question += (curQ.question ? ' ' : '') + line;
    continue;
  }

  // Section header quand pas de question en cours
  if (!curQ) {
    if (!curSection) {
      curSection = { nom: line, questions: [] };
    } else if (curSection.questions.length === 0) {
      curSection.nom = line; // Affiner le nom si pas encore de questions
    } else {
      startSection(line);
    }
  }
}

pushQ();
if (curSection && curSection.questions.length > 0) pdfSections.push(curSection);

console.log('Sections PDF trouvées:', pdfSections.length);
pdfSections.forEach(s => console.log('  [' + s.questions.length + 'q] ' + s.nom));

fs.writeFileSync('pdf_extracted.json', JSON.stringify(pdfSections, null, 2), 'utf-8');

// ── Comparer et patcher le JSON ───────────────────────────────────────────────
let added = 0;
const report = [];

for (const cat of data.categories) {
  for (const th of cat.themes) {
    const normJson = normalize(th.nom);
    let bestSection = null, bestScore = 0;
    for (const sec of pdfSections) {
      const score = overlap(normJson, normalize(sec.nom));
      if (score > bestScore) { bestScore = score; bestSection = sec; }
    }
    if (!bestSection || bestScore < 3) continue;

    const existingNums = new Set(th.questions.map(q => q.numero));
    const newQs = bestSection.questions.filter(q => !existingNums.has(q.numero) && q.reponses.length > 0);
    for (const q of newQs) {
      th.questions.push({ numero: q.numero, question: q.question, options: q.options, reponses: q.reponses, commentaire: q.commentaire });
      added++;
      report.push('+ ' + th.nom + ' Q' + q.numero);
    }
    th.questions.sort((a, b) => a.numero - b.numero);
  }
}

fs.writeFileSync('guide_fusionne_corrige.json', JSON.stringify(data, null, 2), 'utf-8');
console.log('\n' + added + ' questions ajoutées:');
report.forEach(l => console.log('  ' + l));
console.log('\n✅ guide_fusionne_corrige.json sauvegardé');

function normalize(s) {
  return s.toUpperCase()
    .replace(/[ÀÂÄÁ]/g, 'A').replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÎÏÍ]/g, 'I').replace(/[ÔÖÓ]/g, 'O')
    .replace(/[ÙÛÜÚ]/g, 'U').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}
function overlap(a, b) {
  const wa = new Set(a.split(' ').filter(w => w.length > 3));
  const wb = new Set(b.split(' ').filter(w => w.length > 3));
  let c = 0; for (const w of wa) if (wb.has(w)) c++;
  return c;
}
