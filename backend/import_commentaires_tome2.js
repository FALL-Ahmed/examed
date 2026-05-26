"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new client_1.PrismaClient();
function parseFile(filePath) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim());
    const questions = [];
    let i = 0;
    while (i < lines.length) {
        if (/^Q\d+$/.test(lines[i])) {
            i++;
            const questionText = lines[i] || '';
            i++;
            while (i < lines.length && !/^✓/.test(lines[i]) && !/^Q\d+$/.test(lines[i])) {
                i++;
            }
            if (i < lines.length && /^✓/.test(lines[i])) {
                i++;
                i++;
            }
            let commentaire = '';
            if (i < lines.length && lines[i] === 'Commentaire') {
                i++;
                const parts = [];
                while (i < lines.length && !/^Q\d+$/.test(lines[i]) && lines[i] !== '' || (parts.length > 0 && lines[i] === '')) {
                    if (/^Q\d+$/.test(lines[i]))
                        break;
                    if (lines[i] && lines[i] === lines[i].toUpperCase() && lines[i].length > 5 && !/^[A-E]$/.test(lines[i]))
                        break;
                    parts.push(lines[i]);
                    i++;
                }
                commentaire = parts.join(' ').trim();
            }
            if (questionText && commentaire) {
                questions.push({ question: questionText, commentaire });
            }
        }
        else {
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
        if (!q) {
            notFound++;
            continue;
        }
        if (q.explanation && q.explanation.trim()) {
            skipped++;
            continue;
        }
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
//# sourceMappingURL=import_commentaires_tome2.js.map