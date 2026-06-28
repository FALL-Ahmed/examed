/**
 * Traduit les 90 cas cliniques FR → AR via Anthropic API
 * puis importe dans la DB sous theme حالة سريرية / sous-theme حالة سريرية (INFIRMIER AR)
 */
const Anthropic = require('C:/Users/PC/AppData/Local/Temp/node_modules/@anthropic-ai/sdk');
const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const fs = require('fs');

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const prisma = new PrismaClient();
const questions = require('C:/Users/PC/Telechargement/cas_parsed.json');

async function translateBatch(batch) {
  const payload = batch.map((q, i) => ({
    idx: i,
    text: q.text,
    A: q.choices.A, B: q.choices.B, C: q.choices.C, D: q.choices.D, E: q.choices.E,
    comment: q.comment,
  }));

  const prompt = `Tu es un traducteur médical expert français→arabe (dialecte standard médical mauritanien).
Traduis exactement ce JSON de questions médicales infirmières.
Règles strictes :
- Traduis uniquement les valeurs textuelles (text, A, B, C, D, E, comment)
- Ne change PAS les clés JSON ni les index
- Garde les termes médicaux précis en arabe médical standard
- Retourne UNIQUEMENT le JSON valide, sans markdown ni explication

JSON à traduire :
${JSON.stringify(payload, null, 2)}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const jsonStr = raw.replace(/^```json?\s*/,'').replace(/\s*```$/,'');
  return JSON.parse(jsonStr);
}

async function main() {
  const CACHE_FILE = 'C:/Users/PC/Telechargement/cas_ar_translated.json';
  let translated = [];

  if (fs.existsSync(CACHE_FILE)) {
    translated = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log('Cache trouvé:', translated.length, 'questions déjà traduites');
  }

  // Traduire par batch de 5
  const BATCH_SIZE = 5;
  for (let i = translated.length; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    console.log(`Traduction Q${i+1}-${Math.min(i+BATCH_SIZE, questions.length)}...`);
    try {
      const results = await translateBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        const r = results[j] || results.find(x => x.idx === j);
        translated.push({
          module: batch[j].module,
          correct: batch[j].correct,
          text: r.text,
          choices: { A: r.A, B: r.B, C: r.C, D: r.D, E: r.E },
          comment: r.comment,
        });
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(translated, null, 2), 'utf-8');
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error('Erreur batch', i, e.message);
      break;
    }
  }

  console.log('\nTotal traduit:', translated.length, '/ 90');
  if (translated.length < questions.length) {
    console.log('Relancez le script pour continuer...');
    return;
  }

  // Import en base
  console.log('\n=== IMPORT EN BASE ===');

  let theme = await prisma.theme.findFirst({ where: { name: 'حالة سريرية', language: 'AR', target: 'INFIRMIER' } });
  if (!theme) {
    theme = await prisma.theme.create({ data: { name: 'حالة سريرية', language: 'AR', target: 'INFIRMIER' } });
    console.log('✅ Thème créé:', theme.id);
  } else {
    console.log('ℹ️  Thème existant:', theme.id);
  }

  let subTheme = await prisma.subTheme.findFirst({ where: { name: 'حالة سريرية', themeId: theme.id } });
  if (!subTheme) {
    subTheme = await prisma.subTheme.create({ data: { name: 'حالة سريرية', themeId: theme.id } });
    console.log('✅ Sous-thème créé:', subTheme.id);
  } else {
    console.log('ℹ️  Sous-thème existant:', subTheme.id);
  }

  let imported = 0, skipped = 0;
  for (const q of translated) {
    const existing = await prisma.question.findFirst({ where: { text: q.text, subThemeId: subTheme.id } });
    if (existing) { skipped++; continue; }
    await prisma.question.create({
      data: {
        text: q.text,
        choiceA: q.choices.A || '',
        choiceB: q.choices.B || '',
        choiceC: q.choices.C || '',
        choiceD: q.choices.D || '',
        choiceE: q.choices.E || '',
        correctAnswer: q.correct,
        explanation: q.comment || '',
        isActive: true,
        subThemeId: subTheme.id,
      },
    });
    imported++;
  }

  console.log('\n=== RÉSULTAT ===');
  console.log('Importées :', imported);
  console.log('Skippées  :', skipped);
  console.log('Thème ID  :', theme.id, '← à ajouter dans new-content.ts');
}

main().catch(console.error).finally(() => prisma.$disconnect());
