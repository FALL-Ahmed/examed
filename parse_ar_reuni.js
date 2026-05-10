/**
 * parse_ar_reuni.js — Guide infirmier arabe réuni avec correction
 * Gère deux formats d'options:
 *   Format A (TEXT→LETTER): texte option puis lettre
 *   Format B (LETTER→TEXT): lettre puis texte option
 */
const fs = require('fs');

const AR_TO_LAT = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'هـ': 'E', 'ه': 'E' };

function isArNum(s)  { return /^[\d١٢٣٤٥٦٧٨٩٠]{1,4}$/.test(s.trim()); }
function isLetter(s) { return /^[أبجدهـ]{1,2}$/.test(s.trim()); }
function isSep(s)    { return /^-{10,}$/.test(s.trim()); }

function parseAnswers(raw) {
  const out = [];
  for (const p of (raw || '').split(/[،,]/)) {
    const ch = p.trim();
    const l = AR_TO_LAT[ch] || (/^[A-E]$/.test(ch) ? ch : null);
    if (l && !out.includes(l)) out.push(l);
  }
  return out.sort();
}

function parseBlock(lines) {
  const ansIdx = lines.findIndex(l => l === 'الإجابات' || l === 'الإجابة');
  const comIdx = lines.findIndex(l => l === 'التعليق');
  if (ansIdx === -1) return null;

  const beforeAns = lines.slice(0, ansIdx);
  const ansLine   = lines[ansIdx + 1] || '';
  const comLines  = comIdx !== -1 ? lines.slice(comIdx + 1) : [];

  // Détecter les positions des lettres
  const letterPositions = [];
  for (let i = 0; i < beforeAns.length; i++) {
    if (isLetter(beforeAns[i])) letterPositions.push(i);
  }
  if (letterPositions.length === 0) return null;

  // Détecter le format: si l'élément juste avant la 1ère lettre se termine par ؟
  // c'est du texte de question → format LETTRE→TEXTE
  // sinon c'est du texte d'option → format TEXTE→LETTRE
  const firstLp = letterPositions[0];
  const lastBeforeFirst = firstLp > 0 ? beforeAns[firstLp - 1] : '';
  const formatLetterFirst = firstLp === 1 || lastBeforeFirst.trim().endsWith('؟');

  const options = { A: '', B: '', C: '', D: '', E: '' };
  let questionEnd;

  if (formatLetterFirst) {
    // LETTER→TEXT: question avant la 1ère lettre, texte option après la lettre
    questionEnd = letterPositions[0];
    for (const lp of letterPositions) {
      const lat = AR_TO_LAT[beforeAns[lp]];
      if (lat && lp + 1 < beforeAns.length) options[lat] = beforeAns[lp + 1].trim();
    }
  } else {
    // TEXT→LETTER: texte option avant la lettre
    questionEnd = letterPositions[0] - 1;
    for (const lp of letterPositions) {
      const lat = AR_TO_LAT[beforeAns[lp]];
      if (lat && lp > 0) options[lat] = beforeAns[lp - 1].trim();
    }
  }

  const question = beforeAns.slice(0, questionEnd).join(' ').trim();
  const reponses = parseAnswers(ansLine);
  const commentaire = comLines.join(' ').trim();

  if (!question || reponses.length === 0) return null;
  return { question, options, reponses, commentaire };
}

// ── Lecture ─────────────────────────────────────────────────────────────────
const rawLines = fs.readFileSync('new_ar_text.txt', 'utf-8')
  .split('\n').map(l => l.trim()).filter(l => l);

const CHAPTER_RE = /^الفصل[^:]+:\s*(.+)/;
const SECTION_RE = /^(المبحث|تابع المبحث)[^:]*:\s*(.+)/;

const categories = [];
let curCat = null, curTheme = null;
let inBlock = false, blockLines = [];
let pendingSubtheme = null; // sous-thème sans marqueur المبحث

function flushBlock() {
  if (!inBlock || blockLines.length === 0) { inBlock = false; blockLines = []; return; }
  if (!curTheme) { inBlock = false; blockLines = []; return; }
  const parsed = parseBlock(blockLines);
  if (parsed) {
    parsed.numero = curTheme.questions.length + 1;
    curTheme.questions.push(parsed);
  }
  inBlock = false; blockLines = [];
}

function ensureTheme(nom) {
  if (!curCat) { curCat = { nom: 'غير مصنف', themes: [] }; categories.push(curCat); }
  curTheme = { nom, questions: [] };
  curCat.themes.push(curTheme);
}

for (const line of rawLines) {
  // Séparateur
  if (isSep(line)) { flushBlock(); pendingSubtheme = null; continue; }

  // Chapitre
  const chapM = line.match(CHAPTER_RE);
  if (chapM) {
    flushBlock();
    // Nettoyer le nom (cas "الفصل الرابع: الفصل الرابع: ...")
    let nom = chapM[1].replace(/^الفصل[^:]+:\s*/, '').trim();
    curCat = { nom, themes: [] };
    categories.push(curCat);
    curTheme = null; pendingSubtheme = null;
    continue;
  }

  // Sous-thème avec marqueur
  const secM = line.match(SECTION_RE);
  if (secM) {
    flushBlock();
    ensureTheme(secM[2].trim());
    pendingSubtheme = null;
    continue;
  }

  // Numéro de question
  if (isArNum(line)) {
    flushBlock();
    // Si on avait un sous-thème en attente, le créer maintenant
    if (pendingSubtheme) {
      ensureTheme(pendingSubtheme);
      pendingSubtheme = null;
    }
    if (!curTheme) ensureTheme('عام');
    inBlock = true; blockLines = [];
    continue;
  }

  // Contenu du bloc en cours
  if (inBlock) { blockLines.push(line); continue; }

  // Ligne entre questions (potentiel sous-thème sans marqueur المبحث)
  if (!inBlock && curCat && !isLetter(line) && line.length > 8) {
    pendingSubtheme = line;
  }
}
flushBlock();

// ── Stats ───────────────────────────────────────────────────────────────────
let total = 0;
console.log('=== Structure extraite ===');
for (const cat of categories) {
  let c = 0;
  for (const th of cat.themes) c += th.questions.length;
  if (c === 0) continue;
  console.log('\n📂 [' + c + 'q] ' + cat.nom);
  for (const th of cat.themes) {
    if (th.questions.length > 0)
      console.log('   └─ [' + th.questions.length + 'q] ' + th.nom);
  }
  total += c;
}
console.log('\nTOTAL: ' + total + ' questions');

const noOpts = categories.flatMap(c => c.themes).flatMap(t => t.questions)
  .filter(q => !q.options.A && !q.options.B).length;
if (noOpts > 0) console.log('⚠️  Questions sans options: ' + noOpts);

fs.writeFileSync('guide_arabe_reuni.json', JSON.stringify({ categories }, null, 2), 'utf-8');
console.log('✅ guide_arabe_reuni.json créé');
