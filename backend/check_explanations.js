"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const empty = await prisma.question.findMany({
        where: { explanation: '' },
        select: {
            id: true,
            text: true,
            subTheme: { select: { name: true, theme: { select: { name: true } } } },
        },
        orderBy: { subTheme: { name: 'asc' } },
    });
    console.log(`Questions sans commentaire : ${empty.length}\n`);
    const bySubTheme = {};
    for (const q of empty) {
        const key = `${q.subTheme.theme.name} > ${q.subTheme.name}`;
        bySubTheme[key] = (bySubTheme[key] ?? 0) + 1;
    }
    for (const [key, count] of Object.entries(bySubTheme).sort()) {
        console.log(`  ${count}x  ${key}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check_explanations.js.map