// Quick parser test — real PDF format
import { parseText } from './dist/pdf/text-parser.js';

const text = `LES MALADIES INFECTIEUSES


La Rage :


	Quels sont les caractéristiques de l'agent responsable de la rage ?

	Virus à ADN
	 Virus ARN
	 Famille des Rhabdovirus
	 Genre Herpesvirus
	 Non neurotrope
Réponses exactes : B C
Commentaire : Le virus de la rage est un virus à ARN de la famille des Rhabdoviridae (genre Lyssavirus). Il est strictement neurotrope.

	Quels sont les modes de transmission de la rage?

	Morsure d'un animal infecté
	 Griffure
	 Léchage d'une plaie ou d'une muqueuse
	 Transmission par piqûre de moustique
	 Transmission uniquement par ingestion d'aliments contaminés
Réponses exactes : A B C
Commentaire : Le virus se trouve en grande quantité dans la salive des animaux infectés.

	Concernant l'animal mordeur, quelles affirmations sont correctes?

	Si l'animal a disparu → risque élevé
	 Si l'animal est vivant et correctement vacciné → risque nul mais contrôle vétérinaire nécessaire
	 Si l'animal est vivant et non vacciné → risque nul
	Si l'animal est abattu → apporter la tête au laboratoire de référence sur de la glace si possible
	Si l'animal est vivant et non vacciné → mise en observation vétérinaire 15 jours
Réponses exactes : A, B, D, E
Commentaire : La règle d'or est la mise en observation vétérinaire de 15 jours.

PALUDISME :

	Quelle proposition est correcte : concernant le paludisme , le germe en cause  est:

	Tréponème pallidum
	Plasmodium falciparum
	Papilloma virus
	Plasmide
	Plastron
Réponse exacte :  B
Commentaire : Le paludisme est due à un protozoaire du genre Plasmodium.

	Le Paludisme
	Se transmet par contact d'un être humain infecté
	Se transmet par piqure d anophèle femelle
	Se transmet par piqure d'anophèle male
	Se transmet par consommation d'aliments infectés
	Se transmet de la mère vers l'enfant.
Réponse exacte : B
Commentaire : La transmission est indirecte via la piqûre d'un moustique, l'anophèle femelle.

	Parmi les signes cliniques suivant lesquels peuvent se voir en cas de paludisme
	Fièvre aigue
	Céphalée
	Vomissement
	Diarrhée
	Hémorragie extériorisée à type d'épistaxis
Réponses exactes : ABCDE
Commentaire : Le paludisme est un grand simulateur.

	Les signes suivants indiquent un paludisme grave
	La femme enceinte
	L'Hypoglycémie à 0.4g/l
	La détresse respiratoire
	La parasitémie > 4%
	L'insuffisance rénale
Réponse éxacte : BCDE
Commentaire : Signes de gravité selon l'OMS.

LES MENINGITES BACTERIENNES :

	Quelle est la définition des méningites bactériennes ?
	A) Infection virale des méninges
	B) Inflammation aiguë des méninges d'origine bactérienne
	C) Infection fongique des méninges
	D) Enflure des méninges sans infection
	E) Allergie des méninges
	Réponse : B
Commentaire : La méningite bactérienne est une urgence médicale et thérapeutique.

	Quel est le principal germe responsable des méningites chez les nouveaux nés ?
	A) Pneumocoque
	B) Méningocoque
	C) Escherichia coli
	D) Listeria
	E) Staphylocoque
	Réponse : C
Commentaire : Escherichia coli et le Streptocoque du groupe B sont les principaux responsables.

	Quels sont les signes cliniques les plus courants chez un adulte présentant une méningite ?
	A) Toux persistante
	B) Fièvre supérieure à 38°C
	C) Céphalées intenses
	D) Raideur de la nuque
	E) Éruption cutanée
	Réponse : B, C, D
Commentaire : C'est ce qu'on appelle la triade méningée classique.

TETANOS

	Quelle est la cause principale du tétanos ?
	A) Infection virale
	B) Toxine de Clostridium tetani
	C) Infection par un champignon
	D) Infection bactérienne
	E) Infection parasitaire
	Réponse : B, D
Commentaire : Le tétanos est une toxi-infection grave causée par Clostridium tetani.
`;

const result = parseText(text);
console.log('Stats:', JSON.stringify(result.stats, null, 2));
result.themes.forEach(t => {
  console.log(`\nThème: "${t.name}"`);
  t.subThemes.forEach(s => {
    console.log(`  Sous-thème: "${s.name}" (${s.questions.length} questions)`);
    s.questions.forEach((q, i) => {
      console.log(`    Q${i+1}: ${q.text.slice(0, 70)}`);
      console.log(`      A:${q.choiceA||'?'} | B:${q.choiceB||'?'} | C:${q.choiceC||'?'} | D:${q.choiceD||'?'} | E:${q.choiceE||'?'}`);
      console.log(`      Réponse: ${q.correctAnswer}`);
    });
  });
});
