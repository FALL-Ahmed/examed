/**
 * Rattache les images vérifiées des QCM Résidanat (plan produit après revue image par image).
 *  - place = 'question'   → Question.imageUrl (l'énoncé cite lui-même l'image)
 *  - place = 'correction' → ligne « [[image:URL]] » ajoutée à l'explication (affichée seulement avec la correction)
 * Chaque image doit correspondre à UNE seule question RESIDENT (par le début exact de l'énoncé), sinon elle est ignorée.
 * Idempotent : une image déjà rattachée n'est pas ajoutée deux fois.
 * Usage : npx ts-node --transpile-only attach_residanat_images.ts <images_plan.json> <dossier_images> [--dry-run]
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
type Item = { id: number; file: string; n: number; place: 'question' | 'correction'; local: string; stem: string };

function env(key: string) {
  const txt = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const m = new RegExp(`^${key}="?([^"\\n]+)"?`, 'm').exec(txt);
  return m ? m[1] : '';
}
const norm = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();

async function main() {
  const [planFile, dir] = process.argv.slice(2);
  const dry = process.argv.includes('--dry-run');
  const plan: Item[] = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_KEY'));

  const all = await prisma.question.findMany({
    where: { subTheme: { theme: { target: 'RESIDENT' } } },
    select: { id: true, text: true, imageUrl: true, explanation: true, subTheme: { select: { name: true } } },
  });
  const ok: string[] = [], problems: string[] = [];
  const pending = new Map<string, { imageUrl?: string; addLines: string[]; explanation: string }>();

  for (const it of plan) {
    const head = norm(it.stem).slice(0, 90);
    const matches = all.filter((q) => norm(q.text).startsWith(head));
    if (matches.length !== 1) { problems.push(`#${it.id} ${it.file} Q${it.n} : ${matches.length} question(s) trouvée(s) — ignorée`); continue; }
    const q = matches[0];
    const key = `residanat/${it.file.replace(/\.docx$/i, '').replace(/[^\w-]+/g, '_')}-q${it.n}-img${it.id}.jpg`;
    let url = `(dry-run)/${key}`;
    if (!dry) {
      const buf = fs.readFileSync(path.join(dir, path.basename(it.local)));
      const { error } = await supabase.storage.from('question-images').upload(key, buf, { contentType: 'image/jpeg', upsert: true });
      if (error) { problems.push(`#${it.id} upload : ${error.message}`); continue; }
      url = supabase.storage.from('question-images').getPublicUrl(key).data.publicUrl;
    }
    const p = pending.get(q.id) ?? { addLines: [], explanation: q.explanation };
    if (it.place === 'question') p.imageUrl = url;
    else if (!q.explanation.includes(key)) p.addLines.push(`[[image:${url}]]`);
    pending.set(q.id, p);
    ok.push(`#${it.id} → « ${q.subTheme.name} » · ${it.place} · ${q.text.slice(0, 60)}…`);
  }

  if (!dry) {
    for (const [id, p] of pending) {
      await prisma.question.update({
        where: { id },
        data: { ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}), ...(p.addLines.length ? { explanation: `${p.explanation.trim()}\n${p.addLines.join('\n')}` } : {}) },
      });
    }
  }
  ok.forEach((l) => console.log(l));
  console.log(`\n${ok.length} image(s) rattachée(s) à ${pending.size} question(s)${dry ? ' (dry-run, aucune écriture)' : ''}`);
  if (problems.length) { console.log('\nPROBLÈMES :'); problems.forEach((l) => console.log('  ' + l)); }
}

main().catch((e) => { console.error('ERREUR :', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
