"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const ascite = await prisma.subTheme.findFirst({
        where: { name: 'ASCITE', theme: { language: 'AR' } },
    });
    if (ascite) {
        await prisma.subTheme.update({ where: { id: ascite.id }, data: { name: 'الاستسقاء' } });
        console.log('✅ ASCITE → الاستسقاء');
    }
    else {
        console.log('❌ ASCITE non trouvé');
    }
    const babp = await prisma.subTheme.findFirst({
        where: { name: { contains: 'BABP' }, theme: { language: 'AR' } },
    });
    if (babp) {
        await prisma.subTheme.update({ where: { id: babp.id }, data: { name: 'جبيرة بابب (جبيرة الطرف العلوي)' } });
        console.log('✅ BABP → جبيرة بابب (جبيرة الطرف العلوي)');
    }
    else {
        console.log('❌ BABP non trouvé en AR');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=fix_ar_names.js.map