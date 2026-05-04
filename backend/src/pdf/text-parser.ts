/**
 * Parser texte pour le "Guide pratique de l'infirmier - Dr Salihou Fall"
 * Gère plusieurs formats d'extraction PDF.
 */

// Gère : "✓ Bonne(s) réponse(s)\tB,C" / "Réponses correctes\tA,B" / "✓\tA, C" / "Réponse(s): B"
const ANSWER_RE = /^(?:[✓✔]\s*[\t:]\s*|[•\-\*✓✔]?\s*(?:[Bb]onne(?:s|\(s\))?\s*)?[Rr][eé]ponse(?:s|\(s\))?\s*(?:[eé]xacte[s]?|correcte[s]?|juste[s]?)?\s*[:\-–\t]?\s*)(.+)$/i;
// Déclenche l'état "attente des lettres de réponse" (format multi-lignes Tome 2)
// Exemples : "✓ Bonne(s)", "✓", "Bonne(s)", "Bonnes réponses", "Réponses", "correctes", "Réponses correctes"
const ANSWER_TRIGGER_RE = /^(?:[✓✔](?:\s*[Bb]onne(?:s|\(s\))?)?|[Bb]onne(?:s|\(s\))?(?:\s+[Rr][eé]ponse(?:s|\(s\))?)?|[Rr][eé]ponse(?:s|\(s\))?(?:\s+correcte[s]?)?|correcte[s]?)\s*$/i;
// Ligne contenant uniquement les lettres de réponse : "A, B, D, E" ou "B" ou "A, C"
const ANSWER_LETTERS_RE = /^([A-E](?:\s*[,;]\s*[A-E])*)\s*$/;
const QUESTION_NUM_RE = /^(\d{1,3})\s*[\.\)]\s*(.{3,})$/;
const QUESTION_Q_RE = /^[Qq]\s*(\d{1,3})\s+(.{3,})$/;
const QUESTION_WORD_RE = /^[Qq]uestion\s+(\d{1,3})\s*[:\.]?\s*(.*)$/;
const CHOICE_RE: Record<string, RegExp> = {};
for (const l of ['A', 'B', 'C', 'D', 'E', 'F']) {
  CHOICE_RE[l] = new RegExp(`^(?:[•z\\s]*)?[${l.toLowerCase()}${l}]\\s*[\\.):\\t]?\\s*(.+)$`);
}
// Choix sans contenu sur la même ligne ("E." / "E:" / "A" seul) — le texte est sur la ligne suivante
const CHOICE_EMPTY_RE = /^(?:[•\s]*)?([A-Fa-f])\s*[\.):,]?\s*$/;
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

function looksLikeSubTheme(line: string): boolean {
  const s = line.trim().toUpperCase();
  // Les, La, Le, L', Du, De → article français → sous-thème probable
  return /^(LES?\s+|L[''']|LA\s+|DES?\s+|DU\s+)/.test(s);
}

// Même premier mot que le sous-thème actif → section sœur (ex: "Platres manchettes" après "Platres bottes")
function isSiblingSection(line: string, curSub: SubTheme | null): boolean {
  if (!curSub) return false;
  const first = (s: string) => s.trim().split(/[\s:,.()]+/)[0].toUpperCase();
  const w = first(line);
  return w.length > 3 && w === first(curSub.name);
}

function isThemeLine(line: string): boolean {
  const s = line.trim().replace(/\.$/, '');
  if (!s || s.length > 90) return false;
  if (/^\d/.test(s)) return false;
  if (/^[•\-]/.test(s)) return false;
  if (/^[A-Fa-f][\.\):]/.test(s)) return false;
  if (/^[Rr][eé]ponse|^[Ee]xplication|^[Jj]ustification/.test(s)) return false;
  if (/^[Qq]uestion\s+\d/.test(s)) return false;
  if (/^[Qq]\s*\d/.test(s)) return false; // Q1, Q2, Q23... → questions, pas thèmes
  if (/^[A-E]$/.test(s)) return false;   // lettre seule A-E → choix sans ponctuation, pas thème
  const words = s.split(/\s+/);
  if (words.length > 10) return false;
  if (!/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸ]/.test(s)) return false;
  if (words.length <= 5) return true;
  const hasUpperWord = words.some(w => w === w.toUpperCase() && w.length > 2 && /[A-Z]/.test(w));
  const endsColon = s.endsWith(':');
  return hasUpperWord || endsColon;
}

function isNewQuestionLine(line: string): boolean {
  return QUESTION_NUM_RE.test(line) || QUESTION_WORD_RE.test(line) || QUESTION_Q_RE.test(line);
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
  let waitingAnswerLetters = false;
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
    waitingAnswerLetters = false;
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
    waitingAnswerLetters = false;
    inExplanation = false;
    explLines = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (waitingQText) { newQuestion(line); continue; }

    // ── 0a. Attente des lettres de réponse (format multi-lignes Tome 2) ──
    // Ex: "✓ Bonne(s)" → "réponse(s)" → "B, C, D, E"
    if (waitingAnswerLetters) {
      const alm = line.match(ANSWER_LETTERS_RE);
      if (alm && curQuestion && !curQuestion.correctAnswer) {
        const ans = parseCorrectAnswers(alm[1]);
        if (ans) curQuestion.correctAnswer = ans;
        waitingAnswerLetters = false;
        inExplanation = false;
        continue;
      }
      if (ANSWER_TRIGGER_RE.test(line)) continue; // autre mot-clé (ex: "réponse(s)"), on reste
      waitingAnswerLetters = false; // ligne inattendue → réinitialiser
    }

    // ── 0b. Contenu d'un choix vide (ex: "E." suivi de sa valeur sur la ligne suivante) ──
    if (waitingChoiceLetter && curQuestion && !curQuestion.correctAnswer) {
      const key = waitingChoiceLetter;
      (curQuestion as any)[`choice${key}`] = line;
      const idx = CHOICE_LETTERS.indexOf(key as any);
      if (idx >= 0) positionalSlot = idx + 1;
      waitingChoiceLetter = null;
      continue;
    }

    // ── 1. Réponse (format 1 ligne) ──
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

    // ── 1b. Déclencheur de réponse multi-lignes (Tome 2) ──
    // Ex: "✓ Bonne(s)", "✓", "Bonnes", "Réponses", "correctes"
    if (ANSWER_TRIGGER_RE.test(line)) {
      if (curQuestion && !curQuestion.correctAnswer) {
        waitingAnswerLetters = true;
      }
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
      // Les "1. Pain..." dans un commentaire ne sont PAS de nouvelles questions
      const isRealNewQ = QUESTION_Q_RE.test(line) || QUESTION_WORD_RE.test(line) ||
        (QUESTION_NUM_RE.test(line) && !curQuestion.correctAnswer) ||
        /^[Qq]\s*\d{1,3}\s*$/.test(line); // Q1 seul (Tome 2)
      if (isRealNewQ || isThemeLine(line)) {
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

    // ── 4b. Question "Q1 texte" (format tableau avec texte sur même ligne) ──
    const qqm = line.match(QUESTION_Q_RE);
    if (qqm) {
      if (qqm[2].trim()) newQuestion(qqm[2].trim());
      else waitingQText = true;
      continue;
    }

    // ── 4c. Question "Q1" seule (Tome 2 : texte sur la ligne suivante) ──
    if (/^[Qq]\s*\d{1,3}\s*$/.test(line) && (!curQuestion || curQuestion.correctAnswer)) {
      waitingQText = true;
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
        waitingAnswerLetters = false;
      }
      const hasQs = curTheme?.subThemes.some(s => s.questions.length > 0) ?? false;
      if (!curTheme) {
        newTheme(line);
      } else if (curQuestion && (curQuestion.choiceA || curQuestion.correctAnswer)) {
        if (hasQs && !looksLikeSubTheme(line)) newTheme(line); else newSubTheme(line);
      } else if (!curQuestion) {
        // Entête tout en majuscules → forcément nouveau thème
        const isAllCaps = line.trim() === line.trim().toUpperCase() && /[A-Z]/.test(line);
        if (line.endsWith('?') && (!curQuestion || curQuestion.correctAnswer)) {
          // Ligne terminant par '?' → question sans numéro
          newQuestion(line);
        } else if (line.trim().endsWith(':')) {
          // "LES PANSEMENTS :" → sous-thème si article ou section sœur ET curSubTheme explicite
          // Si curSubTheme est "Général" (auto-créé) ET c'est un article, créer un nouveau sous-thème
          const curSubIsGeneral = curSubTheme?.name === 'Général';
          if (curTheme && (looksLikeSubTheme(line) || (!curSubIsGeneral && isSiblingSection(line, curSubTheme)))) {
            newSubTheme(line);
          } else {
            newTheme(line);
          }
        } else if (hasQs) {
          // Thème avec sous-thèmes actifs : article, section sœur → sous-thème, sinon nouveau thème
          if (curTheme && (looksLikeSubTheme(line) || isSiblingSection(line, curSubTheme))) {
            newSubTheme(line);
          } else {
            newTheme(line);
          }
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

export function limitPreview(result: any): any {
  const previewThemes = result.themes.map((theme: any) => ({
    name: theme.name,
    subThemes: theme.subThemes.map((sub: any) => ({
      name: sub.name,
      totalQuestions: sub.questions.length,
      questions: sub.questions.slice(0, 2),
    })),
  }));
  return { ...result, themes: previewThemes, preview: true };
}
