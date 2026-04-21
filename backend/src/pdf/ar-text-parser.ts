/**
 * Parser pour questions médicales en arabe.
 * Gère deux formats :
 *   - Format A : questions tabulées (tab+؟), choix tabulés (avec ou sans label أ) ب) ج))
 *   - Format B : "السؤال X:" suivi du texte + choix non tabulés
 */

export interface ArQuestion {
  text: string;
  choiceA?: string;
  choiceB?: string;
  choiceC?: string;
  choiceD?: string;
  choiceE?: string;
  correctAnswer?: string;
  explanation?: string;
}

export interface ArSubTheme {
  name: string;
  questions: ArQuestion[];
}

export interface ArTheme {
  name: string;
  subThemes: ArSubTheme[];
}

// ── Regex ─────────────────────────────────────────────────────────────────────

// Ligne de réponse (toutes variantes)
const ANSWER_RE = /^(?:الإجابات?\s+(?:الدقيقة|بالضبط|حدد)|مقال\s+الإجابة|الإجابة\s*(?:الدقيقة|بالضبط|حدد)?)\s*[:\s،,]*([أبتثجدهوA-Ea-e،\s,]+)/;

// Explication
const EXPL_RE = /^تعليق[:\s]/;

// Numéro de question (Format B)
const QUESTION_NUM_RE = /^السؤال\s+\d+\s*[:\.]/;

// Choix labellisé (Latin ou arabe) : أ) / أ. / A) / A.
const LABELED_AR_RE = /^([أبتثجدهو])\s*[)\.،]\s*(.+)/;
const LABELED_LATIN_RE = /^([A-Ea-e])\s*[)\.]\s*(.+)/;

// ── Mapping lettres arabes → position A-E ─────────────────────────────────────

const LATIN = ['A', 'B', 'C', 'D', 'E'] as const;
// Deux séquences utilisées dans les MCQ arabes :
//   Seq 1 (alphabétique) : أ ب ت ث ج
//   Seq 2 (MCQ courant)  : أ ب ج د ه
const SEQ1 = ['أ', 'ب', 'ت', 'ث', 'ج'];
const SEQ2 = ['أ', 'ب', 'ج', 'د', 'ه'];

function mapAnswerStr(raw: string, labelMap: Record<string, string>): string {
  const letters = [...raw.matchAll(/[أبتثجدهوA-Ea-e]/g)].map(m => m[0]);
  const hasTA = letters.includes('ت'); // présence de ت → séquence 1
  const seq = hasTA ? SEQ1 : SEQ2;

  const positions: string[] = [];
  for (const l of letters) {
    let pos: string | undefined = labelMap[l];
    if (!pos) {
      if (/[A-Ea-e]/.test(l)) {
        pos = l.toUpperCase();
      } else {
        const idx = seq.indexOf(l);
        if (idx >= 0) pos = LATIN[idx];
        // Fallback si lettre hors séquence principale
        if (!pos) {
          if (l === 'ت') pos = 'C';
          else if (l === 'ث') pos = 'D';
          else if (l === 'ج') pos = hasTA ? 'E' : 'C';
          else if (l === 'د') pos = 'D';
          else if (l === 'ه') pos = 'E';
        }
      }
    }
    if (pos && !positions.includes(pos)) positions.push(pos);
  }
  return positions.sort().join(',');
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseArText(rawText: string): {
  themes: ArTheme[];
  stats: { themes: number; subThemes: number; questions: number };
} {
  const lines = rawText.split('\n');
  const themes: ArTheme[] = [];

  let curTheme: ArTheme | null = null;
  let curSubTheme: ArSubTheme | null = null;
  let curQuestion: ArQuestion | null = null;
  let labelMap: Record<string, string> = {};
  let slot = 0; // position des choix non labellisés
  let inExpl = false;
  let explLines: string[] = [];
  let blankCount = 0;
  let awaitingQuestionText = false; // pour Format B après "السؤال X:"

  function themeHasQs() {
    return curTheme?.subThemes.some(s => s.questions.length > 0) ?? false;
  }

  function flushQuestion() {
    if (!curQuestion) return;
    if (explLines.length && !curQuestion.explanation) {
      curQuestion.explanation = explLines.join(' ').trim();
    }
    if (curQuestion.text && curQuestion.correctAnswer) {
      if (!curSubTheme) {
        if (!curTheme) { curTheme = { name: 'Général', subThemes: [] }; themes.push(curTheme); }
        curSubTheme = { name: curTheme.name, questions: [] };
        curTheme.subThemes.push(curSubTheme);
      }
      curSubTheme.questions.push(curQuestion);
    }
    curQuestion = null; labelMap = {}; slot = 0;
    inExpl = false; explLines = []; awaitingQuestionText = false;
  }

  function newTheme(name: string) {
    flushQuestion();
    curTheme = { name: name.trim(), subThemes: [] };
    themes.push(curTheme);
    curSubTheme = null;
  }

  function newSubTheme(name: string) {
    flushQuestion();
    if (!curTheme) { curTheme = { name: name.trim(), subThemes: [] }; themes.push(curTheme); }
    curSubTheme = { name: name.trim(), questions: [] };
    curTheme.subThemes.push(curSubTheme);
  }

  function startQuestion(text: string) {
    flushQuestion();
    if (!curSubTheme) {
      if (!curTheme) { curTheme = { name: 'Général', subThemes: [] }; themes.push(curTheme); }
      curSubTheme = { name: curTheme.name, questions: [] };
      curTheme.subThemes.push(curSubTheme);
    }
    curQuestion = { text: text.trim() };
    labelMap = {}; slot = 0;
  }

  function addChoice(arLabel: string | null, text: string) {
    if (!curQuestion) return;
    const pos = arLabel ? (labelMap[arLabel] ?? LATIN[slot] ?? 'E') : (LATIN[slot] ?? 'E');
    if (arLabel) {
      labelMap[arLabel] = pos;
      // Enregistrer dans les deux séquences pour la résolution de réponse
      const idx1 = SEQ1.indexOf(arLabel);
      const idx2 = SEQ2.indexOf(arLabel);
      if (idx1 >= 0) labelMap[SEQ1[idx1]] = pos;
      if (idx2 >= 0) labelMap[SEQ2[idx2]] = pos;
    } else {
      // Choix non labellisé : enregistrer avec les deux séquences
      if (SEQ1[slot]) labelMap[SEQ1[slot]] = LATIN[slot];
      if (SEQ2[slot]) labelMap[SEQ2[slot]] = LATIN[slot];
    }
    (curQuestion as any)[`choice${pos}`] = text.trim();
    slot = Math.min(slot + 1, 4);
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // ── Lignes vides ──────────────────────────────────────────────────────────
    if (!trimmed) {
      blankCount++;
      // Fin d'explication après 1 ligne vide (si on a une réponse)
      if (inExpl && curQuestion?.correctAnswer) {
        inExpl = false;
        curQuestion.explanation = explLines.join(' ').trim();
        explLines = [];
      }
      continue;
    }
    const prevBlank = blankCount;
    blankCount = 0;

    const isIndented = rawLine.startsWith('\t') || rawLine.startsWith('  ');
    const content = trimmed;

    // ── Réponse (toujours prioritaire, indentée ou non) ────────────────────────
    const answerMatch = content.match(ANSWER_RE);
    if (answerMatch && curQuestion && !curQuestion.correctAnswer) {
      curQuestion.correctAnswer = mapAnswerStr(answerMatch[1], labelMap);
      continue;
    }

    // ── Explication ────────────────────────────────────────────────────────────
    if (EXPL_RE.test(content)) {
      inExpl = true;
      const rest = content.replace(/^تعليق[:\s]*/, '').trim();
      if (rest) explLines.push(rest);
      continue;
    }

    // Si on est dans l'explication, accumuler sauf si question avec ؟ détectée
    if (inExpl) {
      const isNewQuestion = (isIndented && content.endsWith('؟')) ||
        (isIndented && !content.match(LABELED_AR_RE) && curQuestion?.correctAnswer && prevBlank > 0);
      if (isNewQuestion) {
        inExpl = false;
        if (curQuestion) curQuestion.explanation = explLines.join(' ').trim();
        explLines = [];
        startQuestion(content);
        continue;
      }
      // Ligne de section non-indentée courte → fin d'explication
      if (!isIndented && /[؀-ۿ]/.test(content) && content.length < 60 && !content.includes(':')) {
        inExpl = false;
        if (curQuestion) curQuestion.explanation = explLines.join(' ').trim();
        explLines = [];
        // Traiter comme en-tête de section (ne pas continue)
      } else {
        explLines.push(content);
        continue;
      }
    }

    // ── Format B : "السؤال X:" ────────────────────────────────────────────────
    if (QUESTION_NUM_RE.test(content)) {
      flushQuestion();
      awaitingQuestionText = true;
      continue;
    }

    // ── Contenu indenté ────────────────────────────────────────────────────────
    if (isIndented) {
      // Question terminant par ؟ → toujours une nouvelle question
      if (content.endsWith('؟') || content.endsWith('?')) {
        startQuestion(content);
        continue;
      }

      // Choix labellisé arabe
      const arMatch = content.match(LABELED_AR_RE);
      if (arMatch && curQuestion && !curQuestion.correctAnswer) {
        addChoice(arMatch[1], arMatch[2]);
        continue;
      }

      // Choix labellisé latin
      const latMatch = content.match(LABELED_LATIN_RE);
      if (latMatch && curQuestion && !curQuestion.correctAnswer) {
        (curQuestion as any)[`choice${latMatch[1].toUpperCase()}`] = latMatch[2].trim();
        slot = Math.min(slot + 1, 4);
        continue;
      }

      // Pas de question courante → c'est une question
      if (!curQuestion) {
        startQuestion(content);
        continue;
      }

      // Question courante avec réponse → nouvelle question (si blank avant)
      if (curQuestion.correctAnswer) {
        if (prevBlank > 0) {
          startQuestion(content);
        } else {
          explLines.push(content); // probablement explication tabulée
        }
        continue;
      }

      // Choix non labellisé
      addChoice(null, content);
      continue;
    }

    // ── Contenu non-indenté ────────────────────────────────────────────────────

    // Texte en attente de la question (Format B après السؤال X:)
    if (awaitingQuestionText && /[؀-ۿ]/.test(content)) {
      startQuestion(content);
      awaitingQuestionText = false;
      continue;
    }

    // Choix labellisé non-indenté (Format B)
    const arMatchNI = content.match(LABELED_AR_RE);
    if (arMatchNI && curQuestion && !curQuestion.correctAnswer) {
      addChoice(arMatchNI[1], arMatchNI[2]);
      continue;
    }
    const latMatchNI = content.match(LABELED_LATIN_RE);
    if (latMatchNI && curQuestion && !curQuestion.correctAnswer) {
      (curQuestion as any)[`choice${latMatchNI[1].toUpperCase()}`] = latMatchNI[2].trim();
      slot = Math.min(slot + 1, 4);
      continue;
    }

    // En-tête de section (arabe, court, pas réponse/explication)
    if (/[؀-ۿ]/.test(content)) {
      if (!curTheme) {
        newTheme(content);
      } else if (!curTheme.subThemes.length) {
        newSubTheme(content);
      } else if (prevBlank >= 5 && themeHasQs()) {
        newTheme(content);
      } else {
        newSubTheme(content);
      }
    }
  }

  flushQuestion();

  const totalSubs = themes.reduce((a, t) => a + t.subThemes.length, 0);
  const totalQs = themes.reduce((a, t) =>
    a + t.subThemes.reduce((b, s) => b + s.questions.length, 0), 0);

  return {
    themes,
    stats: { themes: themes.length, subThemes: totalSubs, questions: totalQs },
  };
}

export function limitPreviewAr(result: any, max = 10): any {
  let count = 0;
  const previewThemes = [];
  for (const theme of result.themes) {
    if (count >= max) break;
    const previewSubs = [];
    for (const sub of theme.subThemes) {
      const qs = sub.questions.slice(0, max - count);
      count += qs.length;
      if (qs.length) previewSubs.push({ ...sub, questions: qs });
      if (count >= max) break;
    }
    if (previewSubs.length) previewThemes.push({ ...theme, subThemes: previewSubs });
  }
  return { ...result, themes: previewThemes, preview: true };
}
