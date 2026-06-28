require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Legraa', mode: 'insensitive' } },
        { fullName: { contains: 'Heifa', mode: 'insensitive' } },
        { phone: { contains: '31681518' } },
      ]
    }
  });
  console.log('Users trouvés:', users.length);
  users.forEach(u => console.log('  ID:', u.id, '| fullName:', u.fullName, '| phone:', u.phone, '| email:', u.email, '| role:', u.role));
}

main().catch(e => console.error('ERR:', e.message)).finally(() => prisma.$disconnect());
