import * as fs from 'fs';
import * as JSZip from 'jszip';

const INPUT = 'C:\\Users\\PC\\Telechargement\\Guide-de-la-sage-femme-correction.docx';
const OUTPUT = 'C:\\Users\\PC\\Telechargement\\sage_femme_correction.json';

async function extractParagraphs(docxPath: string): Promise<{ style: string; text: string }[]> {
  const buf = fs.readFileSync(docxPath);
  const zip = await (JSZip as any).loadAsync(buf);
  const xml: string = await zip.file('word/document.xml').async('string');
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const styleRegex = /<w:pStyle w:val="([^"]+)"/;
  const paras: { style: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(xml)) !== null) {
    const sm = styleRegex.exec(m[0]);
    const style = sm ? sm[1] : 'Normal';
    const text = m[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) paras.push({ style, text });
  }
  return paras;
}

async function main() {
  const paras = await extractParagraphs(INPUT);
  const themes: any[] = [];
  let currentTheme: any = null;
  let currentSubTheme: any = null;
  let currentQuestion: any = null;
  let state: 'idle' | 'question' | 'choice' | 'answers' | 'comment' = 'idle';
  let lastChoiceLetter = '';
  const CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

  function ensureSubTheme() {
    if (!currentSubTheme && currentTheme) {
      currentSubTheme = { name: currentTheme.name, questions: [] };
      currentTheme.subThemes.push(currentSubTheme);
    }
  }

  function saveQuestion() {
    if (currentQuestion?.text && currentSubTheme) {
      currentSubTheme.questions.push(currentQuestion);
    }
    currentQuestion = null;
    state = 'idle';
    lastChoiceLetter = '';
  }

  for (const { style, text } of paras) {
    // Titre2 = thème
    if (style === 'Titre2' || style === 'Heading2') {
      saveQuestion();
      currentTheme = { name: text.replace(/:+\s*$/, '').trim(), subThemes: [] };
      themes.push(currentTheme);
      currentSubTheme = null;
      continue;
    }

    // Titre3 = sous-thème
    if (style === 'Titre3' || style === 'Heading3') {
      saveQuestion();
      if (currentTheme) {
        currentSubTheme = { name: text.replace(/:+\s*$/, '').trim(), questions: [] };
        currentTheme.subThemes.push(currentSubTheme);
      }
      continue;
    }

    // Q1, Q2... → nouvelle question
    if (/^Q\d+$/.test(text)) {
      saveQuestion();
      ensureSubTheme();
      currentQuestion = { text: '', choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: '', correctAnswer: '', explanation: '' };
      state = 'question';
      continue;
    }

    if (!currentQuestion) continue;

    // Texte de la question
    if (state === 'question') {
      currentQuestion.text = text;
      state = 'choice';
      continue;
    }

    // Lettre de choix isolée
    if (state === 'choice' && CHOICES.has(text)) {
      lastChoiceLetter = text;
      continue;
    }

    // Texte du choix
    if (state === 'choice' && lastChoiceLetter && text !== 'Réponses Correctes' && !CHOICES.has(text)) {
      currentQuestion[`choice${lastChoiceLetter}`] = text;
      lastChoiceLetter = '';
      continue;
    }

    // Réponses Correctes
    if (text === 'Réponses Correctes') {
      state = 'answers';
      lastChoiceLetter = '';
      continue;
    }
    if (state === 'answers') {
      currentQuestion.correctAnswer = text.replace(/\s/g, '');
      state = 'comment';
      continue;
    }

    // Commentaire
    if (text === 'Commentaire') {
      state = 'comment';
      continue;
    }
    if (state === 'comment' && !currentQuestion.explanation) {
      currentQuestion.explanation = text;
      state = 'idle';
      continue;
    }
  }
  saveQuestion();

  const total = themes.reduce((acc, t) => acc + t.subThemes.reduce((a: number, s: any) => a + s.questions.length, 0), 0);
  console.log(`\n✅ ${themes.length} thèmes, ${total} questions\n`);
  themes.forEach(t => {
    const q = t.subThemes.reduce((a: number, s: any) => a + s.questions.length, 0);
    console.log(`  📁 ${t.name}`);
    t.subThemes.forEach((s: any) => console.log(`      └─ ${s.name}: ${s.questions.length} questions`));
  });

  fs.writeFileSync(OUTPUT, JSON.stringify({ themes }, null, 2), 'utf8');
  console.log(`\n📄 Fichier : ${OUTPUT}`);
}

main().catch(console.error);
