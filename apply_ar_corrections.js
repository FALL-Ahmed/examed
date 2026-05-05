/**
 * apply_ar_corrections.js
 * Parse ar_correction_text.txt, trouve les questions correspondantes
 * dans guide_arabe_final.json et applique les corrections (réponses + commentaires + options).
 */
const fs = require('fs');

const AR_TO_LATIN = { 'أ': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D', 'ه': 'E', 'هـ': 'E' };

function parseAnswers(raw) {
  const out = [];
  // Découper par virgule arabe ou virgule normale
  const parts = raw.split(/[،,]/);
  for (const p of parts) {
    const ch = p.trim();
    const l = AR_TO_LATIN[ch] || (/^[A-E]$/.test(ch) ? ch : null);
    if (l && !out.includes(l)) out.push(l);
  }
  return out.sort();
}

function normText(s) {
  return (s||'').replace(/\s+/g,' ').replace(/[؟?!،,.]/g,'').trim().toLowerCase();
}

function wordOverlap(a, b) {
  const wa = new Set(normText(a).split(/\s+/).filter(w => w.length > 2));
  const wb = new Set(normText(b).split(/\s+/).filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let c = 0; for (const w of wa) if (wb.has(w)) c++;
  return c / Math.max(wa.size, wb.size);
}

// ── Parser le fichier de corrections ─────────────────────────────────────────
const rawLines = fs.readFileSync('ar_correction_text.txt', 'utf-8').split('\n');

const Q_NUM_RE   = /^س\s*\d+/;
const Q_LABEL_RE = /^السؤال\s*$/;
const OPT_AR_RE  = /^([أبجدهـ])\s*$/;
const ANS_MARK   = /^الإجابات?\s*الصحيحة\s*$/;
const COM_MARK   = /^(التعليق|تعليقات)\s*$/;

const corrections = [];
let cur = null, mode = null, pendingOpt = null;

function pushCur() {
  if (!cur || !cur.question || cur.reponses.length === 0) { cur = null; mode = null; return; }
  corrections.push(cur);
  cur = null; mode = null; pendingOpt = null;
}

for (const rawLine of rawLines) {
  const line = rawLine.replace(/\r/,'').trim();

  if (Q_NUM_RE.test(line) || Q_LABEL_RE.test(line)) {
    pushCur();
    cur = { question: '', options: {}, reponses: [], commentaire: '' };
    mode = 'q'; pendingOpt = null;
    continue;
  }

  if (!cur) continue;

  if (ANS_MARK.test(line)) { mode = 'ans'; continue; }
  if (COM_MARK.test(line)) { mode = 'com'; continue; }

  if (mode === 'ans') {
    const r = parseAnswers(line);
    if (r.length > 0) { cur.reponses = r; mode = 'done'; }
    continue;
  }

  if (mode === 'com') {
    cur.commentaire += (cur.commentaire ? ' ' : '') + line;
    continue;
  }

  if (mode === 'q' || mode === 'opts') {
    const oa = line.match(OPT_AR_RE);
    if (oa) {
      const lat = AR_TO_LATIN[oa[1]] || oa[1];
      pendingOpt = lat; mode = 'opts';
      continue;
    }
    if (pendingOpt) {
      cur.options[pendingOpt] = line;
      pendingOpt = null;
      continue;
    }
    if (mode === 'opts') {
      const last = Object.keys(cur.options).pop();
      if (last) { cur.options[last] += ' ' + line; continue; }
    }
    if (mode === 'q') {
      cur.question += (cur.question ? ' ' : '') + line;
    }
  }
}
pushCur();

// Dédupliquer les corrections (même question text)
const seen = new Set();
const uniqueCorrections = [];
for (const c of corrections) {
  const key = normText(c.question).substring(0, 80);
  if (!seen.has(key)) { seen.add(key); uniqueCorrections.push(c); }
}
console.log(uniqueCorrections.length + ' corrections uniques parsées');

// ── Charger guide_arabe_final.json ───────────────────────────────────────────
const jsonData = JSON.parse(fs.readFileSync('guide_arabe_final.json', 'utf-8'));

// Construire liste plate de toutes les questions
const allQ = [];
for (const cat of jsonData.categories)
  for (const th of cat.themes)
    for (const q of th.questions)
      allQ.push({ cat: cat.nom, theme: th.nom, q, th });

console.log(allQ.length + ' questions dans le JSON\n');

// ── Appliquer les corrections ─────────────────────────────────────────────────
let applied = 0, notFound = 0;
const report = [];
const notFoundList = [];

for (const corr of uniqueCorrections) {
  // Trouver la meilleure correspondance
  let best = null, bestScore = 0;
  for (const item of allQ) {
    const score = wordOverlap(corr.question, item.q.question);
    if (score > bestScore) { bestScore = score; best = item; }
  }

  if (!best || bestScore < 0.35) {
    notFound++;
    notFoundList.push('NOT FOUND (score=' + bestScore.toFixed(2) + '): ' + corr.question.substring(0, 60));
    continue;
  }

  const q = best.q;
  const oldAns = (q.reponses||[]).join(',');
  const newAns = corr.reponses.join(',');
  const changed = [];

  // Mettre à jour les réponses si différentes
  if (oldAns !== newAns) {
    q.reponses = corr.reponses;
    changed.push('réponses: ' + oldAns + ' → ' + newAns);
  }

  // Mettre à jour le commentaire si le nouveau est plus long/différent
  if (corr.commentaire && corr.commentaire.length > (q.commentaire||'').length) {
    q.commentaire = corr.commentaire;
    changed.push('commentaire mis à jour');
  }

  // Mettre à jour les options si fournies et plus complètes
  const corrOpts = Object.keys(corr.options);
  if (corrOpts.length >= 2) {
    let optUpdated = false;
    for (const k of corrOpts) {
      if (corr.options[k] && corr.options[k].length > (q.options[k]||'').length) {
        q.options[k] = corr.options[k];
        optUpdated = true;
      }
    }
    if (optUpdated) changed.push('options mises à jour');
  }

  if (changed.length > 0) {
    applied++;
    report.push('[' + best.theme.substring(0,30) + '] Q' + q.numero + ' (score=' + bestScore.toFixed(2) + '): ' + changed.join(' | '));
    report.push('  Q: ' + corr.question.substring(0,60));
  } else {
    report.push('[OK inchangé score=' + bestScore.toFixed(2) + '] ' + corr.question.substring(0,50));
  }
}

fs.writeFileSync('guide_arabe_final.json', JSON.stringify(jsonData, null, 2), 'utf-8');

console.log('=== Corrections appliquées: ' + applied + ' ===');
report.forEach(r => console.log('  ' + r));

if (notFoundList.length > 0) {
  console.log('\n=== Non trouvées: ' + notFound + ' ===');
  notFoundList.forEach(r => console.log('  ' + r));
}

console.log('\n✅ guide_arabe_final.json mis à jour');
