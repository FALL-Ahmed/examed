"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const sub = await prisma.subTheme.findFirst({
        where: { name: 'الاستسقاء', theme: { language: 'AR' } },
        include: { _count: { select: { questions: true } } },
    });
    if (!sub) {
        console.log('Non trouvé');
        return;
    }
    console.log(`Trouvé: "${sub.name}" — ${sub._count.questions} questions`);
    await prisma.subTheme.delete({ where: { id: sub.id } });
    console.log('✅ Supprimé définitivement');
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=delete_empty_theme.js.map