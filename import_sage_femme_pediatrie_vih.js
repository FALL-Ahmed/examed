const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

const data = [
  {
    themeName: 'PEDIATRIE',
    subThemeName: 'INFECTIONS NÉONATALES BACTÉRIENNES',
    questions: [
      {
        text: "Un nouveau-né de 3 jours présente une instabilité thermique, un refus de téter et un teint grisâtre.",
        choiceA: "Ces signes, bien que non spécifiques, doivent faire suspecter une INN.",
        choiceB: "L'INN est dite \"précoce\" si elle survient entre J0 et J7 de vie.",
        choiceC: "Les geignements expiratoires sont un signe de détresse respiratoire liée à l'infection.",
        choiceD: "La raideur de la nuque est le signe le plus fréquent de méningite chez le nouveau-né.",
        choiceE: "Un ictère précoce peut être un signe de sepsis néonatal.",
        correctAnswer: "A,B,C,E",
        explanation: "Chez le nouveau-né, la raideur de la nuque est souvent absente ; il faut rechercher un bombement de la fontanelle ou une hypotonie.",
      },
      {
        text: "L'infirmier évalue le risque infectieux d'un nouveau-né dont la mère a eu une fièvre à 38,5°C pendant le travail.",
        choiceA: "La fièvre maternelle ≥ 38°C est un critère majeur de risque infectieux.",
        choiceB: "Le Streptocoque B et l'Escherichia coli sont les germes les plus fréquents.",
        choiceC: "L'hémoculture est l'examen de référence à réaliser avant toute antibiothérapie.",
        choiceD: "Une CRP normale à la naissance exclut définitivement une infection.",
        choiceE: "La rupture prolongée des membranes (RPM) > 18h est un facteur de risque.",
        correctAnswer: "A,B,C,E",
        explanation: "La CRP est un marqueur tardif (s'élève après 12h) ; une valeur normale à H0 ne permet pas d'éliminer une infection.",
      },
    ],
  },
  {
    themeName: 'VIH',
    subThemeName: 'PTME DU VIH ET HÉPATITE B',
    questions: [
      {
        text: "Une femme VIH+ accouche d'un nouveau-né. Elle est sous ARV depuis 6 mois avec une charge virale (CV) indétectable.",
        choiceA: "Ce nouveau-né est considéré à \"risque faible\" de transmission.",
        choiceB: "La prophylaxie recommandée est la bithérapie AZT + 3TC pendant 6 semaines.",
        choiceC: "Le premier test PCR doit être réalisé entre 4 et 6 semaines de vie.",
        choiceD: "Le risque est \"élevé\" si la mère a été traitée moins de 4 semaines avant l'accouchement.",
        choiceE: "En cas de risque élevé, la prophylaxie AZT + 3TC est prolongée à 12 semaines.",
        correctAnswer: "A,B,C,D,E",
        explanation: "La sécurité de la PTME repose sur le contrôle de la CV maternelle et la précocité de la prophylaxie néonatale.",
      },
      {
        text: "Une femme enceinte est dépistée porteuse de l'Ag HBs au 6ème mois de grossesse.",
        choiceA: "Le dépistage de l'Hépatite B est obligatoire lors du suivi prénatal.",
        choiceB: "Le nouveau-né doit recevoir le vaccin et les immunoglobulines (séro-vaccination) dans les 12-24h.",
        choiceC: "Sans intervention, 90 % des bébés infectés deviendront porteurs chroniques.",
        choiceD: "L'allaitement maternel est formellement interdit pour ces patientes.",
        choiceE: "L'infection chronique expose l'enfant au risque de cirrhose et de cancer du foie à l'âge adulte.",
        correctAnswer: "A,B,C,E",
        explanation: "L'allaitement est autorisé si la séro-vaccination a été correctement effectuée à la naissance.",
      },
      {
        text: "Un enfant né de mère VIH+ est suivi en consultation. L'infirmier discute du diagnostic final et de l'alimentation.",
        choiceA: "L'allaitement maternel exclusif protégé (AMP) est recommandé jusqu'à 6 mois.",
        choiceB: "L'alimentation mixte (sein + lait artificiel) avant 6 mois augmente le risque d'infection.",
        choiceC: "Le diagnostic final est confirmé 2 mois après le sevrage complet.",
        choiceD: "Une sérologie VIH peut être utilisée pour le diagnostic final à l'âge de 18 mois.",
        choiceE: "La prophylaxie au Cotrimoxazole doit débuter dès la naissance.",
        correctAnswer: "A,B,C,D",
        explanation: "La prophylaxie au Cotrimoxazole débute à l'âge de 6 semaines pour tous les enfants exposés.",
      },
    ],
  },
];

async function main() {
  for (const entry of data) {
    // Créer ou récupérer le thème pour SAGE_FEMME
    const theme = await prisma.theme.upsert({
      where: { name_language_target: { name: entry.themeName, language: 'FR', target: 'SAGE_FEMME' } },
      create: { name: entry.themeName, language: 'FR', target: 'SAGE_FEMME', isPublished: true },
      update: {},
    });
    console.log(`✓ Thème "${entry.themeName}" SAGE_FEMME : ${theme.id}`);

    // Créer ou récupérer le sous-thème
    const subTheme = await prisma.subTheme.upsert({
      where: { themeId_name: { themeId: theme.id, name: entry.subThemeName } },
      create: { name: entry.subThemeName, themeId: theme.id },
      update: {},
    });
    console.log(`  ✓ Sous-thème "${entry.subThemeName}" : ${subTheme.id}`);

    // Vérifier si les questions existent déjà (par text + subThemeId)
    for (let i = 0; i < entry.questions.length; i++) {
      const q = entry.questions[i];
      const existing = await prisma.question.findFirst({
        where: { subThemeId: subTheme.id, text: q.text },
      });
      if (existing) {
        console.log(`    ⚠ Question ${i + 1} déjà présente, ignorée.`);
        continue;
      }
      await prisma.question.create({
        data: { ...q, subThemeId: subTheme.id, order: i + 1, isActive: true },
      });
      console.log(`    ✓ Question ${i + 1} créée.`);
    }
  }

  // Résumé final
  const total = await prisma.question.count({
    where: { subTheme: { theme: { target: 'SAGE_FEMME', name: { in: ['PEDIATRIE', 'VIH'] } } } },
  });
  console.log(`\nTotal questions SAGE_FEMME (PEDIATRIE + VIH) : ${total}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
