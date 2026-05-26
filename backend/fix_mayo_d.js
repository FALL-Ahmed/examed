"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const q1 = await prisma.question.findFirst({
        where: { text: { contains: 'objectifs et les indications de cette technique' } },
    });
    if (!q1) {
        console.log('Question non trouvée');
        return;
    }
    await prisma.question.update({
        where: { id: q1.id },
        data: { correctAnswer: 'B,C' },
    });
    console.log('Corrigé ✓ — correctAnswer: B,C');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=fix_mayo_d.js.map