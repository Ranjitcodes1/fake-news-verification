from __future__ import annotations

import re

# Multilingual sentence splitting supporting Latin (.!?), Devanagari/Odia Danda (। \u0964, \u0B70), and Spanish inverted marks (¿¡)
SENTENCE_RE = re.compile(r"(?<=[.!?।\u0964\u0B70])\s+|\n+")
QUOTE_RE = re.compile(r'["“\'«»]([^"”\'«»]{20,})["”\'«»]')

# High-weight factual reporting verbs across English, Odia, Hindi, and Spanish
REPORTING_VERBS = re.compile(
    r"\b(stated|announced|confirmed|banned|approved|introduced|reports?|according|claimed|discovered|"
    r"revealed|authorized|mandated|seized|signed|passed|declared|published|found|concluded|"
    # Odia verbs
    r"କହିଛନ୍ତି|ଦାବି କରିଛନ୍ତି|ଦାବି|ଘୋଷଣା କରିଛନ୍ତି|ଘୋଷଣା|ସ୍ପଷ୍ଟ କରିଛନ୍ତି|ନିଷିଦ୍ଧ|ନିଷିଦ୍ଧ କରାଯାଇଛି|ପ୍ରକାଶ କରିଛନ୍ତି|ମଞ୍ଜୁରୀ|ଜଣାଇଛନ୍ତି|"
    # Hindi verbs
    r"कहा|बताया|घोषित|पुष्टि|प्रतिबंधित|दावा|खोज|मंजूरी|लागू|हस्ताक्षर|जारी|अधिसूचित|खारिज|"
    # Spanish verbs
    r"declaró|afirmó|anunció|confirmó|prohibió|aprobó|reveló|publicó|aseguró|descubrió|desmintió)\b",
    re.IGNORECASE | re.UNICODE,
)

# Quantitative metrics & statistics across English, Odia, Hindi, and Spanish (including Odia ୦-୯ and Hindi/Arabic numerals)
QUANTITATIVE_PATTERNS = re.compile(
    r"(\b\d+(\.\d+)?%|\b[\u0B66-\u0B6F]+%|\b[\u0966-\u096F]+%|"
    r"\b(\d+|[\u0B66-\u0B6F]+|[\u0966-\u096F]+)\s*"
    r"(percent|million|billion|trillion|crore|lakh|dollars|rupees|cases|deaths|tons|"
    r"ପ୍ରତିଶତ|କୋଟି|ଲକ୍ଷ|ହଜାର|ଟଙ୍କା|ମୃତ୍ୟୁ|ମାମଲା|"
    r"प्रतिशत|लाख|करोड़|हजार|डॉलर|रुपये|मौतें|मामले|"
    r"por ciento|millones|billones|dólares|pesos|muertes|casos)\b)|[\$₹€]\d+",
    re.IGNORECASE | re.UNICODE,
)

# Causal and evidence connectives across English, Odia, Hindi, and Spanish
FACTUAL_CONNECTIVES = re.compile(
    r"\b(because|due to|resulting in|as a result|evidence indicates|official data|investigation|"
    # Odia connectives
    r"କାରଣ|ଫଳସ୍ୱରୂପ|ତଦନ୍ତ|ସରକାରୀ ତଥ୍ୟ|ପ୍ରମାଣ|ରିପୋର୍ଟ ଅନୁସାରେ|"
    # Hindi connectives
    r"क्योंकि|के कारण|परिणामस्वरूप|जांच|आधिकारिक डेटा|सबूत|अनुसार|"
    # Spanish connectives
    r"porque|debido a|como resultado|investigación|datos oficiales|pruebas)\b",
    re.IGNORECASE | re.UNICODE,
)

BOILERPLATE_PATTERNS = re.compile(
    r"\b(click here|subscribe|read more|share this|advertisement|copyright|all rights reserved|terms of service|"
    r"ଏଠାରେ କ୍ଲିକ୍ କରନ୍ତୁ|ସବସ୍କ୍ରାଇବ୍|ଆହୁରି ପଢ଼ନ୍ତୁ|ୟାହା ସେୟାର କରନ୍ତୁ|"
    r"यहाँ क्लिक करें|सब्सक्राइब|और पढ़ें|शेयर करें)\b",
    re.IGNORECASE | re.UNICODE,
)


def extract_claims(text: str, limit: int = 5) -> list[dict]:
    """Extract and prioritize verifiable empirical propositions from article text."""
    if not text or not text.strip():
        return []

    raw_candidates: list[str] = []

    # 1. Capture direct quotes as prominent standalone propositions
    for quote_match in QUOTE_RE.finditer(text):
        quote_text = quote_match.group(1).strip()
        if len(quote_text) >= 30:
            raw_candidates.append(f'Direct quote: "{quote_text}"')

    # 2. Extract discrete sentences
    sentences = [part.strip() for part in SENTENCE_RE.split(text.strip()) if len(part.strip()) >= 25]
    raw_candidates.extend(sentences)

    seen = set()
    scored: list[dict] = []

    for candidate in raw_candidates:
        normalized = re.sub(r"\s+", " ", candidate).strip()
        if not normalized or normalized.lower() in seen:
            continue
        seen.add(normalized.lower())

        if BOILERPLATE_PATTERNS.search(normalized):
            continue

        importance = 0.30

        # High-weight factual reporting verbs
        if REPORTING_VERBS.search(normalized):
            importance += 0.25

        # Quantitative metrics & statistics
        if QUANTITATIVE_PATTERNS.search(normalized):
            importance += 0.20
        elif re.search(r"\b\d{4}\b", normalized):  # Years
            importance += 0.10

        # Causal and evidence connectives
        if FACTUAL_CONNECTIVES.search(normalized):
            importance += 0.15

        # Capitalized proper nouns / entity hints
        words = normalized.split()
        if any(token[0].isupper() and token.isalpha() for token in words[1:8] if len(token) > 2):
            importance += 0.05

        # Direct quotes bonus
        if normalized.startswith('Direct quote: "'):
            importance += 0.10

        importance = min(max(importance, 0.25), 0.98)
        scored.append({"text": normalized, "importance": round(importance, 3)})

    # Sort descending by propositional importance
    scored.sort(key=lambda item: item["importance"], reverse=True)
    return scored[:limit]
