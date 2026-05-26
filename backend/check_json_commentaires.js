"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new client_1.PrismaClient();
async function checkJson(file, lang) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../', file), 'utf-8'));
    let withComment = 0, withoutComment = 0;
    const missing = [];
    for (const cat of data.categories) {
        for (const theme of cat.themes) {
            for (const q of theme.questions) {
                if (q.commentaire && q.commentaire.trim()) {
                    withComment++;
                }
                else {
                    withoutComment++;
                    missing.push(`${cat.nom} > ${theme.nom}`);
                }
            }
        }
    }
    console.log(`\n[${lang}] ${file}`);
    console.log(`  ✅ Avec commentaire    : ${withComment}`);
    console.log(`  ❌ Sans commentaire    : ${withoutComment}`);
    if (missing.length > 0) {
        const counts = {};
        for (const m of missing)
            counts[m] = (counts[m] ?? 0) + 1;
        for (const [k, v] of Object.entries(counts).sort())
            console.log(`     ${v}x  ${k}`);
    }
}
async function main() {
    await checkJson('guide_fr_final.json', 'FR');
    await checkJson('guide_arabe_final.json', 'AR');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check_json_commentaires.js.map