/**
 * Parser texte pour le "Guide pratique de l'infirmier - Dr Salihou Fall"
 * Reproduit la logique du parser Python directement en TypeScript.
 */

const ANSWER_RE = /^[•\-\*]?\s*[Rr][eé]ponse[s]?\s*(?:[eé]xacte[s]?|correcte[s]?|juste[s]?)?\s*[:\-–]?\s*(.+)$/i;
const QUESTION_NUM_RE = /^(\d{1,3})\s*[\.\)]\s*(.{3,})$/;
const QUESTION_WORD_RE = /^[Qq]uestion\s+(\d{1,3})\s*[:\.]?\s*(.*)$/;
const CHOICE_RE: Record<string, RegExp> = {};
for (const l of ['A', 'B', 'C', 'D', 'E']) {
  CHOICE_RE[l] = new RegExp(`^(?:[•z\\s]*)?[${l.toLowerCase()}${l}]\\s*[\\.):]\\s*(.+)$`);
}
const EXPL_RE = /^(?:explication|justification|note)\s*[:\-–]?\s*(.*)/i;

function parseCorrectAnswers(raw: string): string {
  const letters = [...raw.toUpperCase().matchAll(/[A-E]/g)].map(m => m[0]);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const l of letters) {
    if (!seen.has(l)) { seen.add(l); result.push(l); }
  }
  return result.join(',');
}

function isThemeLine(line: string): boolean {
  const s = line.trim().replace(/\.$/, '');
  if (!s || s.length > 90) return false;
  if (/^\d/.test(s)) return false;
  if (/^[•\-]/.test(s)) return false;  // ligne bullet → choix ou réponse
  if (/^[A-Ea-e][\.\):]/.test(s)) return false;
  if (/^[Rr][eé]ponse|^[Ee]xplication|^[Jj]ustification/.test(s)) return false;
  if (/^[Qq]uestion\s+\d/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length > 10) return false;
  if (!/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸ]/.test(s)) return false;
  if (words.length <= 5) return true;
  const hasUpperWord = words.some(w => w === w.toUpperCase() && w.length > 2 && /[A-Z]/.test(w));
  const endsColon = s.endsWith(':');
  return hasUpperWord || endsColon;
}

interface Question {
  text: string;
  choiceA: string; choiceB: string; choiceC: string; choiceD: string; choiceE: string;
  correctAnswer: string;
  explanation: string;
  imageUrl: null;
}

interface SubTheme { name: string; questions: Question[]; }
interface Theme { name: string; subThemes: SubTheme[]; }

export function parseText(rawText: string): any {
  const lines = rawText.split('\n');
  const themes: Theme[] = [];
  let curTheme: Theme | null = null;
  let curSubTheme: SubTheme | null = null;
  let curQuestion: Question | null = null;
  let explLines: string[] = [];
  let inExplanation = false;
  let waitingQText = false;

  function ensureSubTheme() {
    if (curTheme && !curSubTheme) {
      curSubTheme = { name: 'Général', questions: [] };
      curTheme.subThemes.push(curSubTheme);
    }
  }

  function flushQuestion() {
    if (curQuestion) {
      if (explLines.length) curQuestion.explanation = explLines.join(' ').trim();
      ensureSubTheme();
      curSubTheme!.questions.push(curQuestion);
    }
    curQuestion = null;
    explLines = [];
    inExplanation = false;
  }

  function newTheme(name: string) {
    flushQuestion();
    if (curTheme) themes.push(curTheme);
    curTheme = { name: name.trim().replace(/[:.]$/, '').trim(), subThemes: [] };
    curSubTheme = null;
  }

  function newSubTheme(name: string) {
    flushQuestion();
    if (curTheme) {
      curSubTheme = { name: name.trim().replace(/[:.]+$/, '').trim(), questions: [] };
      curTheme.subThemes.push(curSubTheme);
    }
  }

  function newQuestion(text: string) {
    flushQuestion();
    ensureSubTheme();
    curQuestion = {
      text: text.trim(),
      choiceA: '', choiceB: '', choiceC: '', choiceD: '', choiceE: '',
      correctAnswer: '', explanation: '', imageUrl: null,
    };
    waitingQText = false;
    inExplanation = false;
    explLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (waitingQText) { newQuestion(line); continue; }

    // Réponse
    const am = line.match(ANSWER_RE);
    if (am && curQuestion) {
      const ans = parseCorrectAnswers(am[1]);
      if (ans) curQuestion.correctAnswer = ans;
      inExplanation = false;
      continue;
    }

    // Choix A-E
    let matchedChoice = false;
    if (curQuestion && !curQuestion.correctAnswer) {
      for (const [ltr, re] of Object.entries(CHOICE_RE)) {
        const cm = line.match(re);
        if (cm) {
          (curQuestion as any)[`choice${ltr}`] = cm[1].trim();
          inExplanation = false;
          matchedChoice = true;
          break;
        }
      }
    }
    if (matchedChoice) continue;

    // Explication
    const em = line.match(EXPL_RE);
    if (em && curQuestion) {
      inExplanation = true;
      explLines = em[1] ? [em[1].trim()] : [];
      continue;
    }

    if (inExplanation && curQuestion) {
      if (QUESTION_NUM_RE.test(line) || QUESTION_WORD_RE.test(line)) {
        inExplanation = false;
      } else {
        explLines.push(line);
        continue;
      }
    }

    // Question "1. texte"
    const qm = line.match(QUESTION_NUM_RE);
    if (qm) {
      if (qm[2].trim()) newQuestion(qm[2].trim());
      else waitingQText = true;
      continue;
    }

    // Question "Question 1 : texte"
    const qwm = line.match(QUESTION_WORD_RE);
    if (qwm) {
      if (qwm[2].trim()) newQuestion(qwm[2].trim());
      else waitingQText = true;
      continue;
    }

    // Thème / Sous-thème
    if (isThemeLine(line)) {
      const hasQuestions = curTheme?.subThemes.some(s => s.questions.length > 0) ?? false;
      if (!curTheme) {
        newTheme(line);
      } else if (curQuestion && (curQuestion.choiceA || curQuestion.correctAnswer)) {
        if (hasQuestions) newTheme(line); else newSubTheme(line);
      } else if (!curQuestion) {
        if (hasQuestions) newTheme(line);
        else if (curTheme) newSubTheme(line);
        else newTheme(line);
      }
      continue;
    }

    // Continuation texte question
    if (curQuestion && !curQuestion.choiceA && !curQuestion.correctAnswer) {
      curQuestion.text += ' ' + line;
    }
  }

  flushQuestion();
  if (curTheme) themes.push(curTheme);

  const themesClean = themes
    .map(t => ({ ...t, subThemes: t.subThemes.filter(s => s.questions.length > 0) }))
    .filter(t => t.subThemes.length > 0);

  const totalQ = themesClean.reduce((a, t) => a + t.subThemes.reduce((b, s) => b + s.questions.length, 0), 0);
  const totalSub = themesClean.reduce((a, t) => a + t.subThemes.length, 0);

  return {
    stats: { themes: themesClean.length, subThemes: totalSub, questions: totalQ },
    themes: themesClean,
  };
}

export function limitPreview(result: any, max = 10): any {
  let count = 0;
  const previewThemes = [];
  for (const theme of result.themes) {
    if (count >= max) break;
    const previewSubs = [];
    for (const sub of theme.subThemes) {
      const remaining = max - count;
      const qs = sub.questions.slice(0, remaining);
      count += qs.length;
      if (qs.length) previewSubs.push({ ...sub, questions: qs });
      if (count >= max) break;
    }
    if (previewSubs.length) previewThemes.push({ ...theme, subThemes: previewSubs });
  }
  return { ...result, themes: previewThemes, preview: true };
}
