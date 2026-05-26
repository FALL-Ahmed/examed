import * as fs from 'fs';
import * as JSZip from 'jszip';

const INPUT = 'C:\\Users\\PC\\Telechargement\\Guide-de-la-sage-femme-Arabe 2.docx';
const OUTPUT = 'C:\\Users\\PC\\Telechargement\\sage_femme_ar.json';

// Mapping lettres arabes → A/B/C/D/E
const AR_TO_LATIN: Record<string, string> = {
  'أ': 'A',       // أ
  'ب': 'B',       // ب
  'ج': 'C',       // ج
  'د': 'D',       // د
  'هـ': 'E', // هـ
  'ه': 'E',       // ه (variante)
};
const AR_CHOICES = new Set(Object.keys(AR_TO_LATIN));

function mapAnswer(raw: string): string {
  // "ب، ج، هـ" → "B,C,E"
  return raw
    .split(/[،,\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => AR_TO_LATIN[s] ?? s)
    .filter(Boolean)
    .join(',');
}

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

  const SKIP = new Set(['الخيار', 'المحتوى']);

  function isChoiceLetter(t: string): boolean {
    return AR_CHOICES.has(t);
  }

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
    // Ignorer les séparateurs et en-têtes de tableau
    if (SKIP.has(text) || /^-{5,}$/.test(text)) continue;

    if (style === 'Titre2' || style === 'Heading2') {
      saveQuestion();
      currentTheme = { name: text.replace(/:+\s*$/, '').trim(), subThemes: [] };
      themes.push(currentTheme);
      currentSubTheme = null;
      continue;
    }

    if (style === 'Titre3' || style === 'Heading3') {
      saveQuestion();
      if (currentTheme) {
        currentSubTheme = { name: text.replace(/:+\s*$/, '').trim(), questions: [] };
        currentTheme.subThemes.push(currentSubTheme);
      }
      continue;
    }

    // سN → nouvelle question
    if (/^[س]\d+$/.test(text)) {
      saveQuestion();
      ensureSubTheme();
      currentQuestion = { text: '', choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: '', correctAnswer: '', explanation: '' };
      state = 'question';
      continue;
    }

    if (!currentQuestion) continue;

    if (state === 'question') {
      currentQuestion.text = text;
      state = 'choice';
      continue;
    }

    if (state === 'choice' && isChoiceLetter(text)) {
      lastChoiceLetter = AR_TO_LATIN[text];
      continue;
    }

    if (state === 'choice' && lastChoiceLetter && text !== 'الاستجابة الصحيحة' && !isChoiceLetter(text)) {
      currentQuestion[`choice${lastChoiceLetter}`] = text;
      lastChoiceLetter = '';
      continue;
    }

    if (text === 'الاستجابة الصحيحة') {
      state = 'answers';
      lastChoiceLetter = '';
      continue;
    }
    if (state === 'answers') {
      currentQuestion.correctAnswer = mapAnswer(text);
      state = 'comment';
      continue;
    }

    if (text === 'التعليق') {
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
