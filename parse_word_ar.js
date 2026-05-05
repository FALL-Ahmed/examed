/**
 * parse_word_ar.js
 * 1. Parse toutes les questions du Word arabe (word_ar_text.txt)
 * 2. Fusionne dans guide_arabe_corrige.json (questions manquantes ajoutées)
 * 4. Sauvegarde guide_arabe_final.json
 */
const fs = require('fs');

const AR_TO_LATIN = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'ه': 'E', 'هـ': 'E' };

const Q_RE        = /^س\s*(\d+)\s*$/;
const Q_INLINE_RE = /^س\s*(\d+)\s+(.+)/;
const OPT_RE      = /^([A-E])\s+(.+)/;
const OPT_ALONE   = /^([A-E])\s*$/;
const ANS_MARK    = /^✓|^الإجابات?\s*$|^الإجابات?\s*الصحيحة/;
const ANS_CONT    = /^الصحيحة\s*$|^الإجابات?\s*$/;
const COM_MARK    = /^تعليق\s*$/;

function parseAnswers(raw) {
  const out = [];
  for (const ch of raw) {
    const l = AR_TO_LATIN[ch] || (/[A-E]/.test(ch) ? ch : null);
    if (l && !out.includes(l)) out.push(l);
  }
  return out.sort();
}

function norm(s) { return (s||'').replace(/\s+/g,' ').trim().substring(0,60); }

function overlap(a, b) {
  const wa = new Set((a||'').split(/\s+/).filter(w=>w.length>2));
  const wb = new Set((b||'').split(/\s+/).filter(w=>w.length>2));
  let c=0; for (const w of wa) if(wb.has(w)) c++;
  return c;
}

function guessCatNom(secNom) {
  if (/تشريح|فسيولوجيا|وظائف الأعضاء|الجهاز التنفسي|الجهاز الهضمي|المسالك البولية|القلب والأوعية|الأعضاء التناسلية/.test(secNom))
    return 'التشريح وعلم وظائف الأعضاء';
  if (/طوارئ|التهاب الصفاق|التهاب البنكرياس|جرح العضلات|التهاب الكبد الحاد/.test(secNom))
    return 'الطوارئ الجراحية';
  if (/جراحة العظام|الجصص|أجبيرة|BABP|أصفاد/.test(secNom))
    return 'جراحة العظام (ORTHOPEDIE)';
  if (/الأمراض المعدية|شيستوسومياز|الحصبة|التوكسوبلازما|التهاب الكبد الفيروسي/.test(secNom))
    return 'الأمراض المعدية';
  return 'التمريض';
}

function getOrCreateTheme(jsonData, catNom, themeNom) {
  let cat = jsonData.categories.find(c => c.nom === catNom);
  if (!cat) { cat = { nom: catNom, themes: [] }; jsonData.categories.push(cat); }
  let theme = cat.themes.find(t => t.nom === themeNom);
  if (!theme) { theme = { nom: themeNom, questions: [] }; cat.themes.push(theme); console.log('  [nouveau thème] ' + themeNom + ' → ' + catNom); }
  return theme;
}

// ── Parser le texte Word ─────────────────────────────────────────────────────
const rawLines = fs.readFileSync('word_ar_text.txt', 'utf-8').split('\n');
const sections = [];
let curSection = null, curQ = null, mode = null, pendingOpt = null, blanks = 0;

function pushQ() {
  if (!curQ || !curQ.question || !curQ.reponses.length || !curSection) return;
  curSection.questions.push(curQ);
  curQ = null; mode = null; pendingOpt = null;
}

function isHeader(line, b) {
  if (b < 1) return false;  // Word: 1 blank suffit (contrairement au PDF)
  if (!line || line.length < 3) return false;
  if (Q_RE.test(line) || /^س\s*\d+/.test(line)) return false;
  if (OPT_RE.test(line) || OPT_ALONE.test(line)) return false;
  if (ANS_MARK.test(line) || ANS_CONT.test(line)) return false;
  if (COM_MARK.test(line)) return false;
  if (/^[أبجدهA-E،,\s]+$/.test(line) && /[أبجدهA-E]/.test(line)) return false;
  return /[؀-ۿ]/.test(line);
}

for (const rawLine of rawLines) {
  const line = rawLine.trim();
  if (!line) { blanks++; continue; }
  const b = blanks; blanks = 0;

  if (isHeader(line, b)) {
    pushQ();
    curSection = { nom: line, questions: [] };
    sections.push(curSection);
    continue;
  }

  const qm = line.match(Q_RE);
  if (qm) {
    pushQ();
    if (!curSection) { curSection = { nom: 'عام', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qm[1]), question: '', options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  const qi = line.match(Q_INLINE_RE);
  if (qi) {
    pushQ();
    if (!curSection) { curSection = { nom: 'عام', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qi[1]), question: qi[2].trim(), options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  if (ANS_MARK.test(line)) { mode = 'ans1'; continue; }
  if (ANS_CONT.test(line) && mode === 'ans1') { mode = 'ans2'; continue; }
  if ((mode === 'ans1' || mode === 'ans2') && curQ && /[أبجدهA-E]/.test(line)) {
    curQ.reponses = parseAnswers(line); mode = 'done'; continue;
  }

  if (COM_MARK.test(line)) { mode = 'com'; continue; }
  if (mode === 'com' && curQ) { curQ.commentaire += (curQ.commentaire ? ' ' : '') + line; continue; }

  if (curQ && (mode === 'q' || mode === 'opts')) {
    const oa = line.match(OPT_ALONE);
    if (oa) { pendingOpt = oa[1]; mode = 'opts'; continue; }
    const om = line.match(OPT_RE);
    if (om) {
      if (pendingOpt) { curQ.options[pendingOpt] = ''; pendingOpt = null; }
      curQ.options[om[1]] = om[2].trim(); mode = 'opts'; continue;
    }
    if (pendingOpt) { curQ.options[pendingOpt] = line; pendingOpt = null; continue; }
    if (mode === 'opts') {
      const last = Object.keys(curQ.options).pop();
      if (last) { curQ.options[last] += ' ' + line; continue; }
    }
  }

  if (curQ && mode === 'q') { curQ.question += (curQ.question ? ' ' : '') + line; continue; }

  if (!curQ && /[؀-ۿ]/.test(line)) {
    if (!curSection || curSection.questions.length > 0) {
      curSection = { nom: line, questions: [] }; sections.push(curSection);
    }
  }
}
pushQ();

let wordTotal = 0;
console.log('=== Sections extraites du Word ===');
sections.forEach(s => {
  if (s.questions.length > 0) { console.log('  [' + s.questions.length + 'q] ' + s.nom); wordTotal += s.questions.length; }
});
console.log('Word total: ' + wordTotal + ' questions\n');

// ── Charger guide_arabe_corrige.json ─────────────────────────────────────────
const jsonData = JSON.parse(fs.readFileSync('guide_arabe_corrige.json', 'utf-8'));

const jsonIndex = new Map();
for (const cat of jsonData.categories)
  for (const th of cat.themes)
    for (const q of th.questions) jsonIndex.set(norm(q.question), th);

console.log('Index existant: ' + jsonIndex.size + ' questions\n');

// ── Fusionner ────────────────────────────────────────────────────────────────
let added = 0, updated = 0;
const report = [];

for (const sec of sections) {
  if (!sec.questions.length) continue;

  let bestTheme = null, bestScore = 0;
  for (const cat of jsonData.categories)
    for (const th of cat.themes) {
      const s = overlap(th.nom, sec.nom);
      if (s > bestScore) { bestScore = s; bestTheme = th; }
    }
  if (!bestTheme || bestScore < 1) bestTheme = getOrCreateTheme(jsonData, guessCatNom(sec.nom), sec.nom);

  for (const pdfQ of sec.questions) {
    const key = norm(pdfQ.question);

    // Déjà présente mais sans commentaire → mettre à jour le commentaire
    if (jsonIndex.has(key)) {
      if (pdfQ.commentaire) {
        const existingTheme = jsonIndex.get(key);
        const existingQ = existingTheme.questions.find(q => norm(q.question) === key);
        if (existingQ && (!existingQ.commentaire || existingQ.commentaire.length < pdfQ.commentaire.length)) {
          existingQ.commentaire = pdfQ.commentaire;
          updated++;
        }
      }
      continue;
    }

    const hasOpts = pdfQ.options.A && pdfQ.options.B;
    const isReal = pdfQ.question.length > 20 && hasOpts && pdfQ.reponses.length > 0;
    if (!isReal) continue;

    const nums = new Set(bestTheme.questions.map(q=>q.numero));
    let num = Math.max(...Array.from(nums), 0) + 1;
    while (nums.has(num)) num++;

    bestTheme.questions.push({ numero: num, question: pdfQ.question, options: pdfQ.options, reponses: pdfQ.reponses, commentaire: pdfQ.commentaire });
    bestTheme.questions.sort((a,b)=>a.numero-b.numero);
    jsonIndex.set(key, bestTheme);
    added++;
    report.push('+ ' + bestTheme.nom.substring(0,35) + ' Q' + num + ': ' + pdfQ.question.substring(0,45));
  }
}

fs.writeFileSync('guide_arabe_final.json', JSON.stringify(jsonData, null, 2), 'utf-8');

console.log(added + ' questions ajoutées, ' + updated + ' commentaires mis à jour');
report.slice(0,20).forEach(l => console.log('  ' + l));

let finalTotal = 0;
console.log('\n=== Structure finale ===');
for (const cat of jsonData.categories) {
  let c = 0; for (const th of cat.themes) c += th.questions.length;
  console.log('[' + c + 'q] ' + cat.nom);
  finalTotal += c;
}
console.log('\nFINAL: ' + finalTotal + ' questions dans guide_arabe_final.json');
console.log('✅ Sauvegardé');
