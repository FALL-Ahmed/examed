"""
ExaMed — PDF Parser Microservice
Adapté au format exact du PDF "Guide pratique de l'infirmier - Dr Salihou Fall"

Structure du PDF :
  - Thématique : ligne courte terminant par ":" ou en MAJUSCULES
  - Question   : "1. Texte..." ou "Question 1 : Texte..."
  - Choix      : "A. texte", "B. texte" OU "• A) texte", "• B) texte"
  - Réponse    : "Réponses exactes : B C" / "Réponse : A, B, D" / "Réponse éxacte : BCD"
  - Réponses multiples supportées → stockées "A,B,C"
"""

import os
import re
import uuid
import fitz          # PyMuPDF — meilleur extracteur de texte
import pdfplumber    # Fallback
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="ExaMed PDF Parser", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

UPLOAD_DIR = Path("/app/uploads")
IMAGES_DIR = UPLOAD_DIR / "images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────────
#  PATTERNS CALIBRÉS SUR LE PDF "GUIDE DE L'INFIRMIER"
# ─────────────────────────────────────────────────────────────────

# Ligne de thématique / section
# Exemples : "La Rage :", "PALUDISME :", "Lavage des mains :", "TETANOS", "GASTROLOGIE"
# Critères :
#   - Courte (< 90 chars)
#   - NE commence PAS par un chiffre
#   - NE commence PAS par •, A., B., C., D., E. (pas un choix)
#   - NE commence PAS par "Réponse" / "Reponse"
#   - Contient peu ou pas de mots minuscules isolés (c'est un titre)
THEME_RE = re.compile(
    r'^(?!(?:\d+[\.\)]|[A-E][\.\):]|[•\-]\s*[A-E][\.\):]|[Rr][eé]ponse|[Ee]xplication|[Cc]ommentaire))'
    r'([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸ][^.\n]{2,80})$'
)

# Question numérotée
# "1. Quels..." / "2. Le Paludisme..." / "Question 1 :" / "Question 1: ..."
QUESTION_NUM_RE = re.compile(r'^(\d{1,3})\s*[\.\)]\s*(.{5,})$')
QUESTION_WORD_RE = re.compile(r'^[Qq]uestion\s+(\d{1,3})\s*[:\.]?\s*(.*)$')

# Choix A–E (deux formats dans le PDF)
# Format 1 : "A. texte" / "A) texte"
# Format 2 : "• A) texte" / "zA) texte" (typo du PDF)
CHOICE_RE = {
    ltr: re.compile(
        rf'^(?:[•z\s]*)?[{ltr.lower()}{ltr}]\s*[\.\)]\s*(.+)$'
    )
    for ltr in 'ABCDE'
}

# Ligne de réponse correcte — TOUS les formats rencontrés dans le PDF :
# "Réponses exactes : B C"
# "Réponse exacte : B"
# "Réponse : B, C, D"
# "Réponses correctes : A, B, D"
# "Réponse éxacte : BCD"
# "Réponse correcte : B"
# "Reponse  B"
# "Réponse éxacte : AB"
# "Réponses éxactes : ABC"
ANSWER_RE = re.compile(
    r'^[Rr][eé]ponse[s]?\s*(?:exacte[s]?|correcte[s]?|juste[s]?)?\s*[:\-–]?\s*(.+)$',
    re.IGNORECASE
)

# Explication (rare dans ce PDF mais prévu)
EXPL_RE = re.compile(r'^(?:explication|justification|note)\s*[:\-–]?\s*(.*)$', re.IGNORECASE)


def parse_correct_answers(raw: str) -> str:
    """
    Extrait les lettres de réponse correctes et retourne "A,B,C".
    Gère : "B C", "A, B, D", "BCD", "ABCDE", "AC", "B", "A, B", "BD", "A, B, D, E"
    """
    # Extraire uniquement les lettres A–E dans le texte
    letters = re.findall(r'[A-E]', raw.upper())
    # Dédupliquer en gardant l'ordre
    seen, result = set(), []
    for l in letters:
        if l not in seen:
            seen.add(l)
            result.append(l)
    return ','.join(result)


def is_theme_line(line: str) -> bool:
    """
    Heuristique pour détecter une ligne de thématique/section.
    Exclut les choix, réponses, questions numérotées, et lignes trop longues.
    """
    s = line.strip().rstrip('.')   # "Hemorragie digestive ." → "Hemorragie digestive"
    if not s or len(s) > 90:
        return False
    # Commencer par un chiffre → question numérotée
    if re.match(r'^\d', s):
        return False
    # Commencer par un choix (A. / • A) / zA) etc.)
    if re.match(r'^[•\-]?\s*[A-Ea-e][\.\):]', s):
        return False
    # Ligne de réponse / explication
    if re.match(r'^[Rr][eé]ponse|^[Ee]xplication|^[Jj]ustification', s):
        return False
    # "Question N" format
    if re.match(r'^[Qq]uestion\s+\d', s):
        return False

    words = s.split()
    if len(words) > 10:
        return False
    if not s[0].isupper():
        return False

    has_upper_word = any(w.isupper() and len(w) > 2 for w in words)
    ends_colon = s.endswith(':')
    # Short line (≤ 5 words) starting with capital → very likely a section title
    if len(words) <= 5:
        return True
    # Longer titles need a strong signal: ends with ":" OR has an all-caps word
    return ends_colon or has_upper_word


# ─────────────────────────────────────────────────────────────────
#  EXTRACTION TEXTE (PyMuPDF en priorité, pdfplumber en fallback)
# ─────────────────────────────────────────────────────────────────

def extract_text_pages(pdf_path: str) -> list[str]:
    """Retourne la liste des textes de chaque page."""
    pages = []
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text = page.get_text("text")   # extraction texte brut
            pages.append(text or "")
        doc.close()
        # Vérifier qu'il y a vraiment du texte
        total = sum(len(p.strip()) for p in pages)
        if total > 100:
            return pages
    except Exception:
        pass

    # Fallback pdfplumber
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
    return pages


def extract_images(pdf_path: str, doc_id: str) -> dict:
    """Retourne {page_num: ["/uploads/images/..."]}"""
    image_map = {}
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            images = doc[page_num].get_images(full=True)
            page_imgs = []
            for idx, img in enumerate(images):
                xref = img[0]
                base = doc.extract_image(xref)
                ext = base["ext"]
                fname = f"{doc_id}_p{page_num+1}_i{idx+1}.{ext}"
                path = IMAGES_DIR / fname
                with open(path, "wb") as f:
                    f.write(base["image"])
                page_imgs.append(f"/uploads/images/{fname}")
            if page_imgs:
                image_map[page_num] = page_imgs
        doc.close()
    except Exception:
        pass
    return image_map


# ─────────────────────────────────────────────────────────────────
#  PARSER PRINCIPAL
# ─────────────────────────────────────────────────────────────────

def parse_lines(all_lines: list[str], image_map: dict = None) -> dict:
    """
    Parse une liste de lignes de texte et retourne la structure thèmes/questions.
    image_map: {page_num: ["/uploads/images/..."]} (optionnel, pour les PDF)
    """
    if image_map is None:
        image_map = {}

    themes = []
    cur_theme = None
    cur_subtheme = None
    cur_question = None
    expl_lines: list[str] = []
    in_explanation = False
    waiting_q_text = None

    def ensure_subtheme():
        nonlocal cur_subtheme
        if cur_theme and not cur_subtheme:
            cur_subtheme = {'name': 'Général', 'questions': []}
            cur_theme['subThemes'].append(cur_subtheme)

    def flush_question():
        nonlocal cur_question, expl_lines, in_explanation
        if cur_question:
            if expl_lines:
                cur_question['explanation'] = ' '.join(expl_lines).strip()
            ensure_subtheme()
            cur_subtheme['questions'].append(cur_question)
        cur_question = None
        expl_lines = []
        in_explanation = False

    def new_theme(name: str):
        nonlocal cur_theme, cur_subtheme
        flush_question()
        if cur_theme:
            themes.append(cur_theme)
        cur_theme = {'name': name.strip(' :'), 'subThemes': []}
        cur_subtheme = None

    def new_subtheme(name: str):
        nonlocal cur_subtheme
        flush_question()
        if cur_theme:
            cur_subtheme = {'name': name.strip(' :.'), 'questions': []}
            cur_theme['subThemes'].append(cur_subtheme)

    def new_question(text: str, img_url=None):
        nonlocal cur_question, in_explanation, expl_lines, waiting_q_text
        flush_question()
        ensure_subtheme()
        cur_question = {
            'text': text.strip(),
            'choiceA': '', 'choiceB': '', 'choiceC': '', 'choiceD': '', 'choiceE': '',
            'correctAnswer': '',
            'explanation': '',
            'imageUrl': img_url,
        }
        waiting_q_text = None
        in_explanation = False
        expl_lines = []

    for line in all_lines:
        line = line.strip()
        if not line:
            continue

        if waiting_q_text is not None:
            new_question(line)
            continue

        m = ANSWER_RE.match(line)
        if m and cur_question:
            raw_ans = m.group(1).strip()
            answers = parse_correct_answers(raw_ans)
            if answers:
                cur_question['correctAnswer'] = answers
            in_explanation = False
            continue

        matched_choice = False
        if cur_question and not cur_question['correctAnswer']:
            for ltr, pattern in CHOICE_RE.items():
                cm = pattern.match(line)
                if cm:
                    cur_question[f'choice{ltr}'] = cm.group(1).strip()
                    in_explanation = False
                    matched_choice = True
                    break
        if matched_choice:
            continue

        em = EXPL_RE.match(line)
        if em and cur_question:
            in_explanation = True
            first = em.group(1).strip()
            expl_lines = [first] if first else []
            continue

        if in_explanation and cur_question:
            if QUESTION_NUM_RE.match(line) or QUESTION_WORD_RE.match(line):
                in_explanation = False
            else:
                expl_lines.append(line)
                continue

        qm = QUESTION_NUM_RE.match(line)
        if qm:
            q_text = qm.group(2).strip()
            if q_text:
                new_question(q_text)
            else:
                waiting_q_text = qm.group(1)
            continue

        qwm = QUESTION_WORD_RE.match(line)
        if qwm:
            q_text = qwm.group(2).strip()
            if q_text:
                new_question(q_text)
            else:
                waiting_q_text = qwm.group(1)
            continue

        if is_theme_line(line):
            if cur_theme is None:
                new_theme(line)
            elif cur_question and (cur_question['choiceA'] or cur_question['correctAnswer']):
                has_questions = any(len(sub['questions']) > 0 for sub in cur_theme['subThemes'])
                if has_questions:
                    new_theme(line)
                else:
                    new_subtheme(line)
            elif not cur_question:
                has_questions = any(
                    len(sub['questions']) > 0
                    for sub in (cur_theme['subThemes'] if cur_theme else [])
                )
                if has_questions:
                    new_theme(line)
                else:
                    if cur_theme:
                        new_subtheme(line)
                    else:
                        new_theme(line)
            continue

        if cur_question and not cur_question['choiceA'] and not cur_question['correctAnswer']:
            cur_question['text'] += ' ' + line

    flush_question()
    if cur_theme:
        themes.append(cur_theme)

    themes_clean = []
    for t in themes:
        subs_clean = [s for s in t['subThemes'] if s['questions']]
        if subs_clean:
            themes_clean.append({**t, 'subThemes': subs_clean})

    total_q = sum(len(s['questions']) for t in themes_clean for s in t['subThemes'])
    total_sub = sum(len(t['subThemes']) for t in themes_clean)

    return {
        'docId': str(uuid.uuid4())[:8],
        'stats': {'themes': len(themes_clean), 'subThemes': total_sub, 'questions': total_q},
        'themes': themes_clean,
        'errors': [],
    }


def parse_pdf(pdf_path: str) -> dict:
    doc_id = str(uuid.uuid4())[:8]
    image_map = extract_images(pdf_path, doc_id)
    pages = extract_text_pages(pdf_path)

    all_lines = []
    for page_num, page_text in enumerate(pages):
        if page_text.strip():
            all_lines.extend(page_text.split('\n'))

    result = parse_lines(all_lines, image_map)
    result['docId'] = doc_id
    return result


# ─────────────────────────────────────────────────────────────────
#  ENDPOINTS
# ─────────────────────────────────────────────────────────────────

class TextBody(BaseModel):
    text: str


def limit_preview(result: dict, max_q: int = 10) -> dict:
    preview_themes, q_count = [], 0
    for theme in result['themes']:
        if q_count >= max_q:
            break
        preview_subs = []
        for sub in theme['subThemes']:
            remaining = max_q - q_count
            qs = sub['questions'][:remaining]
            q_count += len(qs)
            if qs:
                preview_subs.append({**sub, 'questions': qs})
            if q_count >= max_q:
                break
        if preview_subs:
            preview_themes.append({**theme, 'subThemes': preview_subs})
    return {**result, 'themes': preview_themes, 'preview': True}


@app.get("/health")
def health():
    return {"status": "ok", "service": "pdf-parser", "version": "2.0"}


# ── Endpoints PDF ──

@app.post("/parse")
async def parse_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Le fichier doit être un PDF")
    tmp = UPLOAD_DIR / f"tmp_{uuid.uuid4()}.pdf"
    try:
        tmp.write_bytes(await file.read())
        return parse_pdf(str(tmp))
    except Exception as e:
        raise HTTPException(500, f"Erreur parsing: {e}")
    finally:
        tmp.unlink(missing_ok=True)


@app.post("/parse-preview")
async def parse_preview(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Le fichier doit être un PDF")
    tmp = UPLOAD_DIR / f"tmp_{uuid.uuid4()}.pdf"
    try:
        tmp.write_bytes(await file.read())
        return limit_preview(parse_pdf(str(tmp)))
    except Exception as e:
        raise HTTPException(500, f"Erreur parsing: {e}")
    finally:
        tmp.unlink(missing_ok=True)


# ── Endpoints Texte (pour contenu collé directement) ──

@app.post("/parse-text")
async def parse_text_endpoint(body: TextBody):
    """Parse du texte brut collé (pas un fichier PDF)."""
    if not body.text or len(body.text.strip()) < 10:
        raise HTTPException(400, "Texte trop court")
    try:
        lines = body.text.splitlines()
        return parse_lines(lines)
    except Exception as e:
        raise HTTPException(500, f"Erreur parsing: {e}")


@app.post("/parse-text-preview")
async def parse_text_preview(body: TextBody):
    """Parse avec aperçu limité à 10 questions."""
    if not body.text or len(body.text.strip()) < 10:
        raise HTTPException(400, "Texte trop court")
    try:
        lines = body.text.splitlines()
        return limit_preview(parse_lines(lines))
    except Exception as e:
        raise HTTPException(500, f"Erreur parsing: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
