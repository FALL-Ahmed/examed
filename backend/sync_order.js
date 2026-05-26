"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new client_1.PrismaClient();
async function main() {
    const jsonPath = path.join(__dirname, '../../guide_fr_final.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    let updatedSubThemes = 0;
    let updatedQuestions = 0;
    let notFound = 0;
    for (const category of data.categories) {
        const theme = await prisma.theme.findFirst({
            where: { name: { equals: category.nom, mode: 'insensitive' } },
        });
        if (!theme) {
            console.log(`⚠️  Thème non trouvé: ${category.nom}`);
            continue;
        }
        for (let tIdx = 0; tIdx < category.themes.length; tIdx++) {
            const jsonTheme = category.themes[tIdx];
            const subTheme = await prisma.subTheme.findFirst({
                where: {
                    themeId: theme.id,
                    name: { equals: jsonTheme.nom, mode: 'insensitive' },
                },
            });
            if (!subTheme) {
                console.log(`⚠️  Sous-thème non trouvé: ${jsonTheme.nom}`);
                continue;
            }
            await prisma.subTheme.update({
                where: { id: subTheme.id },
                data: { order: tIdx },
            });
            updatedSubThemes++;
            for (let qIdx = 0; qIdx < jsonTheme.questions.length; qIdx++) {
                const jsonQ = jsonTheme.questions[qIdx];
                const q = await prisma.question.findFirst({
                    where: {
                        subThemeId: subTheme.id,
                        text: { contains: jsonQ.question.substring(0, 60) },
                    },
                });
                if (!q) {
                    console.log(`  ❌ Question non trouvée: ${jsonQ.question.substring(0, 60)}...`);
                    notFound++;
                    continue;
                }
                await prisma.question.update({
                    where: { id: q.id },
                    data: { order: qIdx },
                });
                updatedQuestions++;
            }
        }
    }
    console.log(`\n✅ Sous-thèmes mis à jour : ${updatedSubThemes}`);
    console.log(`✅ Questions mises à jour  : ${updatedQuestions}`);
    console.log(`❌ Non trouvés             : ${notFound}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=sync_order.js.map