/**
 * parse_word_fr.js
 * Parse les questions du Word français (tome2_word_text.txt)
 * Fusionne dans guide_fusionne_corrige.json → guide_fr_final.json
 */
const fs = require('fs');

const Q_RE        = /^Q\s*(\d+)\s*$/;
const Q_INLINE_RE = /^Q\s*(\d+)\s+(.+)/;
const OPT_RE      = /^([A-E])\s+(.+)/;
const OPT_ALONE   = /^([A-E])\s*$/;
const ANS_MARK    = /^✓|^Bonne\(s\)|^Bonnes?\s*réponses?|^Réponses?\s*(correctes?|justes?)?/i;
const ANS_VALS    = /^([A-E][,\s]*)+$/;
const COM_MARK    = /^Commentaire\s*$/i;

function norm(s) { return (s||'').replace(/\s+/g,' ').trim().substring(0,60); }

function overlap(a, b) {
  const wa = new Set((a||'').toLowerCase().split(/\s+/).filter(w=>w.length>2));
  const wb = new Set((b||'').toLowerCase().split(/\s+/).filter(w=>w.length>2));
  let c=0; for (const w of wa) if(wb.has(w)) c++;
  return c;
}

function guessCat(secNom) {
  const s = secNom.toUpperCase();
  if (/ESCARRE|SONDE|PANSEMENT|OXYG[EÉ]N|NUTRITION|INIST?MA|IRRIGAT|LAVEMENT|GASTRIQUE/.test(s)) return 'SOINS INFIRMIERS';
  if (/ORTHOP[EÉ]DIE|PLÂTRE|ATTELLE|IMMOBILIS/.test(s)) return 'ORTHOPEDIE';
  if (/UROL|SOND.*URIN|CATH[EÉ]T|V[EÉ]SICALE/.test(s)) return 'UROLOGIE';
  if (/LOMBAIRE|PONCTION|PLEURAL|ASCITE/.test(s)) return 'NEUROLOGIE';
  if (/INFECTI|VACCIN/.test(s)) return 'LES MALADIES INFECTIEUSES';
  if (/URGENCE|CHIRURG/.test(s)) return 'URGENCES CHIRURGICALES';
  if (/ANAT|PHYSIO/.test(s)) return 'ANATOMIE';
  return 'SOINS INFIRMIERS';
}

function getOrCreateTheme(jsonData, catNom, themeNom) {
  let cat = jsonData.categories.find(c => c.nom === catNom);
  if (!cat) { cat = { nom: catNom, themes: [] }; jsonData.categories.push(cat); }
  let theme = cat.themes.find(t => t.nom === themeNom);
  if (!theme) { theme = { nom: themeNom, questions: [] }; cat.themes.push(theme); console.log('  [nouveau thème] ' + themeNom + ' → ' + catNom); }
  return theme;
}

// ── Parser le texte Word ─────────────────────────────────────────────────────
const rawLines = fs.readFileSync('tome2_word_text.txt', 'utf-8').split('\n');
const sections = [];
let curSection = null, curQ = null, mode = null, pendingOpt = null, blanks = 0;

function pushQ() {
  if (!curQ || !curQ.question || !curQ.reponses.length || !curSection) return;
  curSection.questions.push(curQ);
  curQ = null; mode = null; pendingOpt = null;
}

function isHeader(line, b) {
  if (b < 1) return false;
  if (!line || line.length < 3) return false;
  if (Q_RE.test(line) || /^Q\s*\d+/.test(line)) return false;
  if (OPT_RE.test(line) || OPT_ALONE.test(line)) return false;
  if (ANS_MARK.test(line) || ANS_VALS.test(line)) return false;
  if (COM_MARK.test(line)) return false;
  // Doit ressembler à un titre de section (majuscules ou titre)
  if (/^[A-E][,\s]*[A-E]/.test(line)) return false;
  return /[A-Za-zÀ-ÿ]/.test(line) && !/^\d+[.,)]/.test(line);
}

for (const rawLine of rawLines) {
  const line = rawLine.replace(/\r/g,'').trimEnd();
  const trimmed = line.trim();
  if (!trimmed) { blanks++; continue; }
  const b = blanks; blanks = 0;

  if (isHeader(trimmed, b)) {
    pushQ();
    curSection = { nom: trimmed, questions: [] };
    sections.push(curSection);
    continue;
  }

  const qm = trimmed.match(Q_RE);
  if (qm) {
    pushQ();
    if (!curSection) { curSection = { nom: 'SOINS INFIRMIERS', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qm[1]), question: '', options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  const qi = trimmed.match(Q_INLINE_RE);
  if (qi) {
    pushQ();
    if (!curSection) { curSection = { nom: 'SOINS INFIRMIERS', questions: [] }; sections.push(curSection); }
    curQ = { numero: parseInt(qi[1]), question: qi[2].trim(), options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  if (ANS_MARK.test(trimmed)) { mode = 'ans'; continue; }

  if (mode === 'ans' && curQ) {
    // Ligne "réponse(s)" suite du marqueur ✓ Bonne(s) / réponse(s)
    if (/^réponse/i.test(trimmed)) { continue; }
    // Ligne avec les lettres réponses
    const letters = trimmed.match(/[A-E]/g);
    if (letters && letters.length > 0 && /^[A-E,\s]+$/.test(trimmed)) {
      curQ.reponses = [...new Set(letters)].sort();
      mode = 'done';
      continue;
    }
  }

  if (COM_MARK.test(trimmed)) { mode = 'com'; continue; }
  if (mode === 'com' && curQ) { curQ.commentaire += (curQ.commentaire ? ' ' : '') + trimmed; continue; }

  if (curQ && (mode === 'q' || mode === 'opts')) {
    const oa = trimmed.match(OPT_ALONE);
    if (oa) { pendingOpt = oa[1]; mode = 'opts'; continue; }
    const om = trimmed.match(OPT_RE);
    if (om) {
      if (pendingOpt) { curQ.options[pendingOpt] = ''; pendingOpt = null; }
      curQ.options[om[1]] = om[2].trim(); mode = 'opts'; continue;
    }
    if (pendingOpt) { curQ.options[pendingOpt] = trimmed; pendingOpt = null; mode = 'opts'; continue; }
    if (mode === 'opts') {
      const last = Object.keys(curQ.options).pop();
      if (last) { curQ.options[last] += ' ' + trimmed; continue; }
    }
  }

  if (curQ && mode === 'q') { curQ.question += (curQ.question ? ' ' : '') + trimmed; continue; }

  if (!curQ && /[A-Za-zÀ-ÿ]/.test(trimmed) && trimmed.length > 5) {
    if (!curSection || curSection.questions.length > 0) {
      curSection = { nom: trimmed, questions: [] };
      sections.push(curSection);
    } else if (curSection) {
      curSection.nom = trimmed;
    }
  }
}
pushQ();

let wordTotal = 0;
console.log('=== Sections extraites du Word FR ===');
sections.forEach(s => {
  if (s.questions.length > 0) { console.log('  [' + s.questions.length + 'q] ' + s.nom); wordTotal += s.questions.length; }
});
console.log('Word FR total: ' + wordTotal + ' questions\n');

// ── Charger guide_fusionne_corrige.json ─────────────────────────────────────
const jsonData = JSON.parse(fs.readFileSync('guide_fusionne_corrige.json', 'utf-8'));

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
  if (!bestTheme || bestScore < 1) bestTheme = getOrCreateTheme(jsonData, guessCat(sec.nom), sec.nom);

  for (const wQ of sec.questions) {
    const key = norm(wQ.question);

    if (jsonIndex.has(key)) {
      if (wQ.commentaire) {
        const existingTheme = jsonIndex.get(key);
        const existingQ = existingTheme.questions.find(q => norm(q.question) === key);
        if (existingQ && (!existingQ.commentaire || existingQ.commentaire.length < wQ.commentaire.length)) {
          existingQ.commentaire = wQ.commentaire;
          updated++;
        }
      }
      continue;
    }

    const hasOpts = wQ.options.A && wQ.options.B;
    const isReal = wQ.question.length > 20 && hasOpts && wQ.reponses.length > 0;
    if (!isReal) continue;

    const nums = new Set(bestTheme.questions.map(q=>q.numero));
    let num = Math.max(...Array.from(nums), 0) + 1;
    while (nums.has(num)) num++;

    bestTheme.questions.push({ numero: num, question: wQ.question, options: wQ.options, reponses: wQ.reponses, commentaire: wQ.commentaire });
    bestTheme.questions.sort((a,b)=>a.numero-b.numero);
    jsonIndex.set(key, bestTheme);
    added++;
    report.push('+ ' + bestTheme.nom.substring(0,35) + ' Q' + num + ': ' + wQ.question.substring(0,45));
  }
}

fs.writeFileSync('guide_fr_final.json', JSON.stringify(jsonData, null, 2), 'utf-8');

console.log(added + ' questions ajoutées, ' + updated + ' commentaires mis à jour');
report.slice(0,20).forEach(l => console.log('  ' + l));

let finalTotal = 0;
console.log('\n=== Structure finale ===');
for (const cat of jsonData.categories) {
  let c = 0; for (const th of cat.themes) c += th.questions.length;
  console.log('[' + c + 'q] ' + cat.nom);
  finalTotal += c;
}
console.log('\nFINAL: ' + finalTotal + ' questions dans guide_fr_final.json');
console.log('✅ Sauvegardé');
