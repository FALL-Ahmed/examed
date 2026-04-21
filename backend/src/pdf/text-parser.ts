/**
 * Parser texte pour le "Guide pratique de l'infirmier - Dr Salihou Fall"
 * Gère plusieurs formats d'extraction PDF.
 */

const ANSWER_RE = /^[•\-\*]?\s*[Rr][eé]ponse[s]?\s*(?:[eé]xacte[s]?|correcte[s]?|juste[s]?)?\s*[:\-–]?\s*(.+)$/i;
const QUESTION_NUM_RE = /^(\d{1,3})\s*[\.\)]\s*(.{3,})$/;
const QUESTION_WORD_RE = /^[Qq]uestion\s+(\d{1,3})\s*[:\.]?\s*(.*)$/;
const CHOICE_RE: Record<string, RegExp> = {};
for (const l of ['A', 'B', 'C', 'D', 'E', 'F']) {
  CHOICE_RE[l] = new RegExp(`^(?:[•z\\s]*)?[${l.toLowerCase()}${l}]\\s*[\\.):]\\s*(.+)$`);
}
// Choix sans contenu sur la même ligne ("E." ou "E:") — le texte est sur la ligne suivante
const CHOICE_EMPTY_RE = /^(?:[•\s]*)?([A-Fa-f])\s*[\.):]\s*$/;
const EXPL_RE = /^(?:commentaire[s]?|explication|justification|note)\s*[:\-–]?\s*(.*)/i;
// Question naturelle : longue (≥15 chars après premier) ou se terminant par ? ou :
const QUESTION_NATURAL_RE = /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸ].{14,}[?:]\s*$|^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸ].{34,}$/;

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

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
  if (/^[•\-]/.test(s)) return false;
  if (/^[A-Fa-f][\.\):]/.test(s)) return false;
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

function isNewQuestionLine(line: string): boolean {
  return QUESTION_NUM_RE.test(line) || QUESTION_WORD_RE.test(line);
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
  let waitingChoiceLetter: string | null = null;
  let positionalSlot = 0;
  let themeHasQuestions = false;

  function ensureSubTheme() {
    if (curTheme && !curSubTheme) {
      curSubTheme = { name: 'Général', questions: [] };
      curTheme.subThemes.push(curSubTheme);
    }
  }

  function flushQuestion() {
    if (curQuestion && curQuestion.correctAnswer) {
      if (explLines.length) curQuestion.explanation = explLines.join(' ').trim();
      ensureSubTheme();
      curSubTheme!.questions.push(curQuestion);
      themeHasQuestions = true;
    }
    curQuestion = null;
    explLines = [];
    inExplanation = false;
    positionalSlot = 0;
    waitingChoiceLetter = null;
  }

  function newTheme(name: string) {
    flushQuestion();
    if (curTheme) themes.push(curTheme);
    curTheme = { name: name.trim().replace(/[:.]$/, '').trim(), subThemes: [] };
    curSubTheme = null;
    themeHasQuestions = false;
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
    positionalSlot = 0;
    waitingQText = false;
    inExplanation = false;
    explLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (waitingQText) { newQuestion(line); continue; }

    // ── 0. Contenu d'un choix vide (ex: "E." suivi de sa valeur sur la ligne suivante) ──
    if (waitingChoiceLetter && curQuestion && !curQuestion.correctAnswer) {
      const key = waitingChoiceLetter;
      (curQuestion as any)[`choice${key}`] = line;
      const idx = CHOICE_LETTERS.indexOf(key as any);
      if (idx >= 0) positionalSlot = idx + 1;
      waitingChoiceLetter = null;
      continue;
    }

    // ── 1. Réponse ──
    const am = line.match(ANSWER_RE);
    if (am) {
      if (curQuestion && !curQuestion.correctAnswer) {
        const ans = parseCorrectAnswers(am[1]);
        if (ans) curQuestion.correctAnswer = ans;
      }
      inExplanation = false;
      waitingChoiceLetter = null;
      continue;
    }

    // ── 2. Explication ──
    const em = line.match(EXPL_RE);
    if (em && curQuestion) {
      inExplanation = true;
      explLines = em[1] ? [em[1].trim()] : [];
      continue;
    }

    // ── 3. Continuation de l'explication ──
    if (inExplanation && curQuestion) {
      // une nouvelle question ou un thème sort de l'explication
      if (isNewQuestionLine(line) || (curTheme && QUESTION_NATURAL_RE.test(line) && curQuestion.correctAnswer) || isThemeLine(line)) {
        inExplanation = false;
        // on laisse tomber dans la suite du parsing
      } else {
        explLines.push(line);
        continue;
      }
    }

    // ── 4. Question numérotée "1. texte" ──
    const qm = line.match(QUESTION_NUM_RE);
    if (qm) {
      if (qm[2].trim()) newQuestion(qm[2].trim());
      else waitingQText = true;
      continue;
    }

    // ── 5. Question "Question 1 : texte" ──
    const qwm = line.match(QUESTION_WORD_RE);
    if (qwm) {
      if (qwm[2].trim()) newQuestion(qwm[2].trim());
      else waitingQText = true;
      continue;
    }

    // ── 6. Choix avec lettre (A. B) • A) …) ──
    // AVANT isThemeLine pour éviter que "Virus à ADN" soit détecté comme thème
    let matchedChoice = false;
    if (curQuestion && !curQuestion.correctAnswer) {
      // Choix vide : "E." ou "E:" seul → la valeur est sur la ligne suivante
      const cem = line.match(CHOICE_EMPTY_RE);
      if (cem) {
        const rawLtr = cem[1].toUpperCase();
        waitingChoiceLetter = rawLtr === 'F' ? 'E' : rawLtr;
        matchedChoice = true;
      } else {
        for (const [ltr, re] of Object.entries(CHOICE_RE)) {
          const cm = line.match(re);
          if (cm) {
            const key = ltr === 'F' ? 'E' : ltr;
            if (ltr !== 'F' || !curQuestion.choiceE) {
              (curQuestion as any)[`choice${key}`] = cm[1].trim();
            }
            const idx = CHOICE_LETTERS.indexOf(key as any);
            if (idx >= 0 && idx >= positionalSlot) positionalSlot = idx + 1;
            inExplanation = false;
            matchedChoice = true;
            break;
          }
        }
      }
    }
    if (matchedChoice) continue;

    // ── 7. Choix sans lettre (positionnels A→E) ──
    if (curQuestion && !curQuestion.correctAnswer && positionalSlot < 5) {
      (curQuestion as any)[`choice${CHOICE_LETTERS[positionalSlot]}`] = line;
      positionalSlot++;
      continue;
    }

    // ── 8. Question naturelle (sans numéro, longue ou terminant par ? / :) ──
    // Exclure les entêtes tout en majuscules (PALUDISME, LES MENINGITES…)
    const isAllCapsLine = line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line);
    if (curTheme && QUESTION_NATURAL_RE.test(line) && (!curQuestion || curQuestion.correctAnswer) && !isAllCapsLine) {
      newQuestion(line);
      continue;
    }

    // ── 9. Thème / Sous-thème ──
    if (isThemeLine(line)) {
      // Libérer la question complète avant de décider la structure (évite hasQs = false faussement)
      if (curQuestion && curQuestion.correctAnswer) {
        flushQuestion();
      } else if (curQuestion && !curQuestion.choiceA && !curQuestion.correctAnswer) {
        // Question vide (contenu parasite de l'explication) → effacer sans sauvegarder
        curQuestion = null;
        explLines = [];
        inExplanation = false;
        positionalSlot = 0;
        waitingChoiceLetter = null;
      }
      const hasQs = curTheme?.subThemes.some(s => s.questions.length > 0) ?? false;
      if (!curTheme) {
        newTheme(line);
      } else if (curQuestion && (curQuestion.choiceA || curQuestion.correctAnswer)) {
        if (hasQs) newTheme(line); else newSubTheme(line);
      } else if (!curQuestion) {
        // Entête tout en majuscules → forcément nouveau thème
        const isAllCaps = line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line);
        if (themeHasQuestions && line.split(/\s+/).length <= 6 && !line.endsWith(':') && !isAllCaps) {
          // Ligne courte, mixte, dans un thème avec questions → question sans numéro
          newQuestion(line);
        } else if (hasQs || line.trim().endsWith(':')) {
          // Thème avec questions ou ligne terminant par ':' → nouveau thème
          newTheme(line);
        } else if (curTheme) {
          newSubTheme(line);
        } else {
          newTheme(line);
        }
      }
      continue;
    }

    // ── 10. Continuation texte question (avant tout choix) ──
    if (curQuestion && positionalSlot === 0 && !curQuestion.correctAnswer) {
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
