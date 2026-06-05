import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fields = ['text', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE', 'explanation'] as const;
  const entities: Record<string, string> = {
    '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'",
  };

  const questions = await (prisma as any).question.findMany({
    where: {
      OR: fields.map(f => ({
        [f]: { contains: '&lt;' },
      })).concat(fields.map(f => ({ [f]: { contains: '&gt;' } }))),
    },
  });

  console.log(`${questions.length} questions à corriger`);
  let fixed = 0;

  for (const q of questions) {
    const update: any = {};
    for (const f of fields) {
      const val: string = q[f] ?? '';
      let replaced = val;
      for (const [entity, char] of Object.entries(entities)) {
        replaced = replaced.split(entity).join(char);
      }
      if (replaced !== val) update[f] = replaced;
    }
    if (Object.keys(update).length > 0) {
      await (prisma as any).question.update({ where: { id: q.id }, data: update });
      fixed++;
      const preview = Object.entries(update).map(([k, v]) => `${k}: "${v}"`).join(', ');
      console.log(`✅ [${q.id}] ${preview.slice(0, 100)}`);
    }
  }

  console.log(`\nTerminé : ${fixed} questions corrigées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
