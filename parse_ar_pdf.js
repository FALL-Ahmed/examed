/**
 * parse_ar_pdf.js
 * 1. Parse TOUTES les questions du PDF arabe
 * 2. Déduplique le guide v2 arabe.json existant
 * 3. Ajoute les questions manquantes (crée les thèmes/catégories si besoin)
 * 4. Sauvegarde guide_arabe_corrige.json
 */
const fs = require('fs');

const AR_TO_LATIN = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'ه': 'E', 'هـ': 'E' };

const Q_RE         = /^س\s*(\d+)\s*$/;
const Q_INLINE_RE  = /^س\s*(\d+)\s+(.+)/;   // "س7 texte de la question"
const OPT_RE       = /^([A-E])\s+(.+)/;
const OPT_ALONE    = /^([A-E])\s*$/;
const ANS_MARK     = /^✓|^الإجابات?\s*$|^الإجابة\s*الصحيحة/;
const ANS_CONT     = /^الصحيحة\s*$|^الإجابات?\s*$/;
const COM_MARK     = /^تعليق\s*$/;

function parseAnswers(raw) {
  const out = [];
  for (const ch of raw) {
    const l = AR_TO_LATIN[ch] || (/[A-E]/.test(ch) ? ch : null);
    if (l && !out.includes(l)) out.push(l);
  }
  return out.sort();
}

// ── Étape 1 : Parser le PDF → liste de sections (nom + questions) ─────────────
const rawLines = fs.readFileSync('ar_text.txt', 'utf-8').split('\n');
const sections = [];
let curSection = null;
let curQ = null;
let mode = null;
let pendingOpt = null;
let blanks = 0;

function pushQ() {
  if (!curQ || !curQ.question || !curQ.reponses.length || !curSection) return;
  curSection.questions.push(curQ);
  curQ = null; mode = null; pendingOpt = null;
}

function isHeader(line, b) {
  if (b < 2) return false;
  if (!line || line.length < 3) return false;
  if (Q_RE.test(line)) return false;
  if (/^س\s*\d+/.test(line)) return false;   // question inline (ex: "س7 texte...")
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

  // Section header (prioritaire, avant tout)
  if (isHeader(line, b)) {
    pushQ();
    curSection = { nom: line, questions: [] };
    sections.push(curSection);
    continue;
  }

  // Question numérotée seule ("س1")
  const qm = line.match(Q_RE);
  if (qm) {
    pushQ();
    if (!curSection) { curSection = { nom: 'عام', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qm[1]), question: '', options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  // Question inline ("س7 texte de la question")
  const qi = line.match(Q_INLINE_RE);
  if (qi) {
    pushQ();
    if (!curSection) { curSection = { nom: 'عام', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qi[1]), question: qi[2].trim(), options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  // Marqueur réponse
  if (ANS_MARK.test(line)) { mode = 'ans1'; continue; }
  if (ANS_CONT.test(line) && mode === 'ans1') { mode = 'ans2'; continue; }
  if ((mode === 'ans1' || mode === 'ans2') && curQ && /[أبجدهA-E]/.test(line)) {
    curQ.reponses = parseAnswers(line); mode = 'done'; continue;
  }

  // Marqueur commentaire
  if (COM_MARK.test(line)) { mode = 'com'; continue; }
  if (mode === 'com' && curQ) { curQ.commentaire += (curQ.commentaire ? ' ' : '') + line; continue; }

  // Options
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

  // Suite texte question
  if (curQ && mode === 'q') { curQ.question += (curQ.question ? ' ' : '') + line; continue; }

  // Première section (avant tout header)
  if (!curQ && /[؀-ۿ]/.test(line) && !curSection) {
    curSection = { nom: line, questions: [] }; sections.push(curSection);
  }
}
pushQ();

// Stats PDF
let pdfTotal = 0;
console.log('=== Sections extraites du PDF ===');
sections.forEach(s => {
  if (s.questions.length > 0) {
    console.log('  [' + s.questions.length + 'q] ' + s.nom);
    pdfTotal += s.questions.length;
  }
});
console.log('PDF total: ' + pdfTotal + ' questions dans ' + sections.filter(s=>s.questions.length>0).length + ' sections\n');

// ── Étape 2 : Charger le JSON et dédupliquer ────────────────────────────────
const jsonData = JSON.parse(fs.readFileSync('guide v2 arabe.json', 'utf-8'));
let dupRemoved = 0;
for (const cat of jsonData.categories) {
  for (const th of cat.themes) {
    const seen = new Map();
    for (const q of th.questions) {
      const ex = seen.get(q.numero);
      if (!ex || (q.commentaire||'').length > (ex.commentaire||'').length) seen.set(q.numero, q);
      else dupRemoved++;
    }
    th.questions = Array.from(seen.values()).sort((a,b)=>a.numero-b.numero);
  }
}
console.log('Doublons supprimés du JSON existant: ' + dupRemoved);

// ── Étape 3 : Index global par texte normalisé ───────────────────────────────
function norm(s) {
  return (s||'').replace(/\s+/g,' ').trim().substring(0,60);
}

const jsonIndex = new Map();
for (const cat of jsonData.categories) {
  for (const th of cat.themes) {
    for (const q of th.questions) jsonIndex.set(norm(q.question), th);
  }
}

// ── Helpers pour créer/retrouver catégories et thèmes ───────────────────────
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

function getOrCreateCat(catNom) {
  let cat = jsonData.categories.find(c => c.nom === catNom);
  if (!cat) {
    cat = { nom: catNom, themes: [] };
    jsonData.categories.push(cat);
  }
  return cat;
}

function getOrCreateTheme(catNom, themeNom) {
  const cat = getOrCreateCat(catNom);
  let theme = cat.themes.find(t => t.nom === themeNom);
  if (!theme) {
    theme = { nom: themeNom, questions: [] };
    cat.themes.push(theme);
    console.log('  [nouveau thème] ' + themeNom + ' → ' + catNom);
  }
  return theme;
}

// ── Étape 4 : Matcher sections PDF → thèmes JSON, créer si besoin ───────────
let added = 0;
const report = [];
const skipped = [];

for (const sec of sections) {
  if (!sec.questions.length) continue;

  // Trouver le meilleur thème existant
  let bestTheme = null, bestScore = 0;
  for (const cat of jsonData.categories) {
    for (const th of cat.themes) {
      const s = overlap(th.nom, sec.nom);
      if (s > bestScore) { bestScore = s; bestTheme = th; }
    }
  }

  // Si pas de match suffisant, créer un nouveau thème
  if (!bestTheme || bestScore < 1) {
    const catNom = guessCatNom(sec.nom);
    bestTheme = getOrCreateTheme(catNom, sec.nom);
  }

  for (const pdfQ of sec.questions) {
    const key = norm(pdfQ.question);
    if (jsonIndex.has(key)) continue; // déjà présente

    const hasOpts = pdfQ.options.A && pdfQ.options.B;
    const isReal = pdfQ.question.length > 20 && hasOpts && pdfQ.reponses.length > 0;
    if (!isReal) { skipped.push('[incomplet] ' + sec.nom.substring(0,30) + ' | ' + pdfQ.question.substring(0,40)); continue; }

    const nums = new Set(bestTheme.questions.map(q=>q.numero));
    let num = Math.max(...Array.from(nums), 0) + 1;
    while (nums.has(num)) num++;

    bestTheme.questions.push({
      numero: num, question: pdfQ.question, options: pdfQ.options,
      reponses: pdfQ.reponses, commentaire: pdfQ.commentaire
    });
    bestTheme.questions.sort((a,b)=>a.numero-b.numero);
    jsonIndex.set(key, bestTheme);
    added++;
    report.push('+ ' + bestTheme.nom.substring(0,35) + ' Q' + num + ': ' + pdfQ.question.substring(0,45));
  }
}

// ── Sauvegarder ──────────────────────────────────────────────────────────────
fs.writeFileSync('guide_arabe_corrige.json', JSON.stringify(jsonData, null, 2), 'utf-8');

console.log('\n' + added + ' questions ajoutées:');
report.forEach(l => console.log('  ' + l));
if (skipped.length) {
  console.log('\n' + skipped.length + ' questions incomplètes ignorées:');
  skipped.slice(0,10).forEach(l => console.log('  - ' + l));
}

// Stats finales
let finalTotal = 0;
console.log('\n=== Structure finale ===');
for (const cat of jsonData.categories) {
  let catTotal = 0;
  for (const th of cat.themes) catTotal += th.questions.length;
  console.log('CAT [' + catTotal + 'q]: ' + cat.nom);
  for (const th of cat.themes) {
    if (th.questions.length > 0) console.log('  [' + th.questions.length + 'q] ' + th.nom);
  }
  finalTotal += catTotal;
}
console.log('\nFINAL: ' + finalTotal + ' questions dans guide_arabe_corrige.json');
console.log('✅ Sauvegardé');
