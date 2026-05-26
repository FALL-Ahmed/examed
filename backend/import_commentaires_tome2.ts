import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseFile(filePath: string) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim());
  const questions: { question: string; commentaire: string }[] = [];

  let i = 0;
  while (i < lines.length) {
    // Détecte début d'une question (Qn)
    if (/^Q\d+$/.test(lines[i])) {
      i++;
      const questionText = lines[i] || '';
      i++;

      // Sauter les options A/B/C/D/E
      while (i < lines.length && !/^✓/.test(lines[i]) && !/^Q\d+$/.test(lines[i])) {
        i++;
      }

      // Sauter la ligne des bonnes réponses
      if (i < lines.length && /^✓/.test(lines[i])) {
        i++; // ligne "✓ Bonne(s) réponse(s)"
        i++; // ligne "B, C, D"
      }

      // Lire le commentaire
      let commentaire = '';
      if (i < lines.length && lines[i] === 'Commentaire') {
        i++;
        const parts: string[] = [];
        while (i < lines.length && !/^Q\d+$/.test(lines[i]) && lines[i] !== '' || (parts.length > 0 && lines[i] === '')) {
          if (/^Q\d+$/.test(lines[i])) break;
          // Arrêt si on rencontre un nouveau thème (ligne en majuscules sans Q)
          if (lines[i] && lines[i] === lines[i].toUpperCase() && lines[i].length > 5 && !/^[A-E]$/.test(lines[i])) break;
          parts.push(lines[i]);
          i++;
        }
        commentaire = parts.join(' ').trim();
      }

      if (questionText && commentaire) {
        questions.push({ question: questionText, commentaire });
      }
    } else {
      i++;
    }
  }
  return questions;
}

async function main() {
  const filePath = path.join(__dirname, '../../tome2_word_text.txt');
  const parsed = parseFile(filePath);
  console.log(`📄 Questions parsées depuis le fichier: ${parsed.length}`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const item of parsed) {
    const q = await prisma.question.findFirst({
      where: { text: { contains: item.question.substring(0, 60) } },
    });
    if (!q) { notFound++; continue; }
    if (q.explanation && q.explanation.trim()) { skipped++; continue; }

    await prisma.question.update({
      where: { id: q.id },
      data: { explanation: item.commentaire },
    });
    updated++;
  }

  console.log(`✅ Mis à jour : ${updated}`);
  console.log(`⏭️  Déjà remplis : ${skipped}`);
  console.log(`❌ Non trouvés : ${notFound}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
