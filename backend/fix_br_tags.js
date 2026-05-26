"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const questions = await prisma.question.findMany({
        where: { explanation: { contains: '<br' } },
        select: { id: true, explanation: true, text: true },
    });
    console.log(`Questions avec <br/> : ${questions.length}`);
    for (const q of questions) {
        const fixed = q.explanation
            .replace(/<br\s*\/>/gi, '\n')
            .replace(/<br>/gi, '\n');
        await prisma.question.update({ where: { id: q.id }, data: { explanation: fixed } });
        console.log(`✅ ${q.text.substring(0, 60)}...`);
    }
    console.log('Terminé');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=fix_br_tags.js.map