/**
 * Import des 210 questions "Complément Biologiste"
 * Thèmes créés avec isPublished: false (invisibles jusqu'à activation du switch admin)
 * Target: BIOLOGISTE, Language: FR
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// ── Structure thèmes / sous-thèmes ──────────────────────────────────────────
const STRUCTURE = [
  {
    theme: 'BIOLOGIE MOLÉCULAIRE',
    subs: [
      { name: 'Structures et propriétés des acides nucléiques', s: 4,    e: 692  },
      { name: "La réplication de l'ADN",                        s: 692,  e: 1378 },
      { name: 'Transcription',                                   s: 1378, e: 1720 },
      { name: 'Maturation des ARN',                              s: 1720, e: 2062 },
      { name: 'La traduction',                                   s: 2062, e: 2404 },
      { name: "Régulation de l'expression génétique",           s: 2404, e: 2748 },
    ],
  },
  {
    theme: 'TECHNIQUES DE BIOLOGIE MOLÉCULAIRE',
    subs: [
      { name: 'Extraction et purification des acides nucléiques', s: 2748, e: 3260 },
      { name: 'Dosage des acides nucléiques',                     s: 3260, e: 3602 },
      { name: 'Électrophorèse',                                   s: 3602, e: 3944 },
      { name: 'Marquage des acides nucléiques',                   s: 3944, e: 4114 },
      { name: 'Hybridation des acides nucléiques',                s: 4114, e: 4592 },
      { name: 'PCR',                                              s: 4592, e: 5486 },
      { name: 'Génie génétique',                                  s: 5486, e: 6172 },
    ],
  },
  {
    theme: 'VIROLOGIE ET DIAGNOSTIC',
    subs: [
      { name: 'Nature, structure et stabilité des virus',          s: 6178, e: 6694 },
      { name: 'Qualité et caractéristiques des tests diagnostiques', s: 6694, e: 6866 },
      { name: 'Techniques de détection directe et moléculaire',   s: 6866, e: 7211 },
    ],
  },
];

// ── Parser ───────────────────────────────────────────────────────────────────
function parseSlice(lines, start, end) {
  const slice = lines.slice(start, end);
  const questions = [];
  let cur = null;

  for (const line of slice) {
    const l = line.trim();
    if (/^\d{2}$/.test(l)) {
      if (cur && cur.text && cur.answer) questions.push(cur);
      cur = { text: '', choices: {}, answer: '', expl: '', state: 'text', lastChoice: null };
      continue;
    }
    if (!cur) continue;
    if (['A', 'B', 'C', 'D', 'E'].includes(l) && cur.state !== 'answer' && cur.state !== 'expl') {
      cur.state = 'choice';
      cur.lastChoice = l;
      cur.choices[l] = '';
      continue;
    }
    if (l === 'Réponses') { cur.state = 'answer'; continue; }
    if (l === 'Commentaire') { cur.state = 'expl'; continue; }
    if (!l) continue;

    if (cur.state === 'text' && !cur.text) { cur.text = l; continue; }
    if (cur.state === 'choice' && cur.lastChoice && !cur.choices[cur.lastChoice]) {
      cur.choices[cur.lastChoice] = l; continue;
    }
    if (cur.state === 'answer' && !cur.answer) { cur.answer = l.trim(); continue; }
    if (cur.state === 'expl' && !cur.expl) { cur.expl = l; continue; }
  }
  if (cur && cur.text && cur.answer) questions.push(cur);
  return questions;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const raw = fs.readFileSync(__dirname + '/complement_bio_raw.txt', 'utf8');
  const lines = raw.split('\n');

  let totalInserted = 0;

  for (const block of STRUCTURE) {
    console.log(`\n📚 Thème: ${block.theme}`);

    // Créer ou récupérer le thème avec isPublished: false
    const theme = await prisma.theme.upsert({
      where: { name_language_target: { name: block.theme, language: 'FR', target: 'BIOLOGISTE' } },
      update: {},
      create: { name: block.theme, language: 'FR', target: 'BIOLOGISTE', isPublished: false },
    });
    console.log(`  → Thème "${theme.name}" (id: ${theme.id}, isPublished: ${theme.isPublished})`);

    for (let si = 0; si < block.subs.length; si++) {
      const sub = block.subs[si];
      const parsed = parseSlice(lines, sub.s, sub.e);
      console.log(`  📂 ${sub.name}: ${parsed.length} questions`);

      // Créer ou récupérer le sous-thème
      const subTheme = await prisma.subTheme.upsert({
        where: { themeId_name: { themeId: theme.id, name: sub.name } },
        update: {},
        create: { name: sub.name, themeId: theme.id, order: si + 1 },
      });

      // Insérer les questions
      for (let qi = 0; qi < parsed.length; qi++) {
        const q = parsed[qi];
        await prisma.question.create({
          data: {
            text:          q.text,
            choiceA:       q.choices['A'] || '',
            choiceB:       q.choices['B'] || '',
            choiceC:       q.choices['C'] || '',
            choiceD:       q.choices['D'] || '',
            choiceE:       q.choices['E'] || '',
            correctAnswer: q.answer,
            explanation:   q.expl,
            subThemeId:    subTheme.id,
            isActive:      true,
            order:         qi + 1,
          },
        });
        totalInserted++;
      }
      console.log(`    ✓ ${parsed.length} questions insérées`);
    }
  }

  console.log(`\n✅ Import terminé — ${totalInserted} questions insérées au total`);
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
