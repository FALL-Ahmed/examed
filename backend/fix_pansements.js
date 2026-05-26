"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const FIXES = [
    {
        contains: 'plusieurs plaies, quelles règles de base',
        explanation: "La règle d'asepsie impose d'aller du \"plus propre vers le plus sale\". Le lavage des mains et la protection du site sont des étapes préliminaires indispensables. L'usage d'une pince unique pour plusieurs zones est une faute d'hygiène.",
    },
    {
        contains: 'plaie post-opératoire. Quelles étapes du déroulement',
        explanation: "Le lavage antiseptique et la séparation des pinces par zone (propre/stérile) sont cruciaux. Le pansement souillé doit être éliminé via la filière des déchets contaminés. La plaie doit être rincée et séchée avant d'être recouverte.",
    },
    {
        contains: 'pansement complexe, quels gestes techniques',
        explanation: "Le protocole inclut le nettoyage/désinfection (plaie et pourtour), le rinçage et le séchage. Un frottement vigoureux est traumatisant pour les tissus en cours de cicatrisation et doit être évité.",
    },
    {
        contains: 'réfection du pansement, quels éléments cliniques',
        explanation: "Les transmissions doivent décrire précisément l'aspect de la plaie (bourgeonnement, propreté, épithélialisation) pour permettre un suivi de l'évolution. La marque du savon n'a aucune valeur clinique.",
    },
    {
        contains: 'phase finale de la réfection du pansement',
        explanation: "La plaie doit être protégée par des compresses stériles et un pansement (souvent occlusif). Tout le matériel à usage unique (pinces, gants) doit être éliminé. On ne laisse pas une plaie à l'air libre si un pansement est prescrit.",
    },
];
async function main() {
    for (const fix of FIXES) {
        const q = await prisma.question.findFirst({
            where: { text: { contains: fix.contains } },
        });
        if (!q) {
            console.log(`❌ Non trouvée: ${fix.contains}`);
            continue;
        }
        await prisma.question.update({ where: { id: q.id }, data: { explanation: fix.explanation } });
        console.log(`✅ ${fix.contains.substring(0, 50)}...`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=fix_pansements.js.map