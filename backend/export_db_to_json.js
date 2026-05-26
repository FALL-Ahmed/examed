"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new client_1.PrismaClient();
async function exportLang(lang, outFile) {
    const themes = await prisma.theme.findMany({
        where: { language: lang },
        orderBy: { order: 'asc' },
        include: {
            subThemes: {
                orderBy: { order: 'asc' },
                include: {
                    questions: {
                        where: { isActive: true },
                        orderBy: { order: 'asc' },
                    },
                },
            },
        },
    });
    const categories = themes.map((theme) => ({
        nom: theme.name,
        themes: theme.subThemes.map((sub, sIdx) => ({
            nom: sub.name,
            questions: sub.questions.map((q, qIdx) => ({
                numero: qIdx + 1,
                question: q.text,
                options: {
                    A: q.choiceA,
                    B: q.choiceB,
                    C: q.choiceC,
                    D: q.choiceD,
                    E: q.choiceE,
                },
                reponses: q.correctAnswer.split(',').map((r) => r.trim()),
                commentaire: q.explanation,
            })),
        })),
    }));
    const outPath = path.join(__dirname, '../../', outFile);
    fs.writeFileSync(outPath, JSON.stringify({ categories }, null, 2), 'utf-8');
    const totalSubThemes = categories.reduce((s, c) => s + c.themes.length, 0);
    const totalQuestions = categories.reduce((s, c) => s + c.themes.reduce((ss, t) => ss + t.questions.length, 0), 0);
    console.log(`✅ ${outFile} exporté`);
    console.log(`   ${categories.length} catégories · ${totalSubThemes} sous-thèmes · ${totalQuestions} questions`);
}
async function main() {
    await exportLang('FR', 'guide_fr_final.json');
    await exportLang('AR', 'guide_arabe_final.json');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=export_db_to_json.js.map