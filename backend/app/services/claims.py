from __future__ import annotations

import re

SENTENCE_RE = re.compile(r"(?<=[.!?])\s+|\n+")
QUOTE_RE = re.compile(r'["“\']([^"”\']{20,})["”\']')

REPORTING_VERBS = re.compile(
    r"\b(stated|announced|confirmed|banned|approved|introduced|reports?|according|claimed|discovered|"
    r"revealed|authorized|mandated|seized|signed|passed|declared|published|found|concluded)\b",
    re.IGNORECASE,
)
QUANTITATIVE_PATTERNS = re.compile(
    r"\b(\d+(\.\d+)?%|\d+(\.\d+)?\s*(percent|million|billion|trillion|crore|lakh|dollars|rupees|cases|deaths|tons))\b|\$\d+",
    re.IGNORECASE,
)
FACTUAL_CONNECTIVES = re.compile(
    r"\b(because|due to|resulting in|as a result|evidence indicates|official data|investigation)\b",
    re.IGNORECASE,
)
BOILERPLATE_PATTERNS = re.compile(
    r"\b(click here|subscribe|read more|share this|advertisement|copyright|all rights reserved|terms of service)\b",
    re.IGNORECASE,
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
