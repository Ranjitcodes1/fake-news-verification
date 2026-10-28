from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

# Unicode Script Block Ranges
ODIA_RANGE = re.compile(r"[\u0B00-\u0B7F]")
DEVANAGARI_RANGE = re.compile(r"[\u0900-\u097F]")  # Hindi, Marathi, Sanskrit, Nepali
BENGALI_RANGE = re.compile(r"[\u0980-\u09FF]")     # Bengali, Assamese
TAMIL_RANGE = re.compile(r"[\u0B80-\u0BFF]")
TELUGU_RANGE = re.compile(r"[\u0C00-\u0C7F]")
GUJARATI_RANGE = re.compile(r"[\u0A80-\u0AFF]")
PUNJABI_RANGE = re.compile(r"[\u0A00-\u0A7F]")     # Gurmukhi
KANNADA_RANGE = re.compile(r"[\u0C80-\u0CFF]")
MALAYALAM_RANGE = re.compile(r"[\u0D00-\u0D7F]")
CYRILLIC_RANGE = re.compile(r"[\u0400-\u04FF]")
ARABIC_RANGE = re.compile(r"[\u0600-\u06FF]")

# Distinctive word lexicons for Latin-script languages
ENGLISH_WORDS = {
    "the", "and", "is", "in", "that", "it", "with", "as", "for", "was", "on", "are",
    "by", "this", "from", "at", "be", "have", "has", "had", "not", "they", "an",
    "which", "or", "after", "said", "were", "been", "their", "will", "would",
    "there", "about", "who", "reported", "police", "officials", "state", "news",
    "government", "against", "over", "into", "also", "court", "investigation", "authorities"
}
SPANISH_WORDS = {"el", "la", "de", "que", "en", "los", "se", "del", "las", "por", "un", "para", "con", "no", "una", "su", "al", "lo", "como", "más", "pero", "sus", "le", "ya", "fue", "este", "ha", "sí", "porque", "esta", "son", "entre", "está", "cuando", "muy", "sin", "sobre", "ser", "tiene", "también", "me", "hasta", "hay", "donde", "quien", "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso", "ante", "ellos", "esto", "mí", "antes", "algunos", "qué", "unos", "otro", "otras", "otra", "él", "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "sea", "poco", "ella", "estar", "haber", "estas", "estaba", "estamos", "noticias", "declaró", "afirmó"}
FRENCH_WORDS = {"le", "la", "et", "les", "des", "du", "une", "pour", "est", "que", "qui", "dans", "par", "sur", "avec", "ce", "ses", "sont", "ne", "il", "ont", "plus", "pas", "son", "aux", "se", "nous", "comme", "mais", "on", "tout", "leur", "cette", "si", "fait", "elle", "été", "aussi", "ces", "deux", "même", "très", "après", "bien", "sans", "peut", "encore", "faire", "entre", "alors", "autres", "selon", "dont", "tous", "mon", "déclaré", "affirmé"}
GERMAN_WORDS = {"der", "die", "und", "den", "von", "zu", "das", "mit", "sich", "des", "auf", "für", "ist", "im", "dem", "nicht", "ein", "eine", "als", "auch", "es", "an", "werden", "aus", "er", "hat", "dass", "sie", "nach", "wird", "bei", "einer", "um", "am", "sind", "noch", "wie", "einem", "über", "einen", "sie", "zum", "war", "haben", "nur", "oder", "aber", "vor", "zur", "bis", "mehr", "durch", "man", "sein", "wurde", "sei", "prozent", "erklärte", "bestätigt"}


@dataclass(frozen=True)
class LanguageInfo:
    code: str
    name: str
    native_name: str
    script: str
    is_regional: bool = False


LANGUAGE_REGISTRY: dict[str, LanguageInfo] = {
    "or": LanguageInfo(code="or", name="Odia", native_name="ଓଡ଼ିଆ", script="Odia", is_regional=True),
    "hi": LanguageInfo(code="hi", name="Hindi", native_name="हिन्दी", script="Devanagari", is_regional=True),
    "bn": LanguageInfo(code="bn", name="Bengali", native_name="বাংলা", script="Bengali", is_regional=True),
    "ta": LanguageInfo(code="ta", name="Tamil", native_name="தமிழ்", script="Tamil", is_regional=True),
    "te": LanguageInfo(code="te", name="Telugu", native_name="తెలుగు", script="Telugu", is_regional=True),
    "gu": LanguageInfo(code="gu", name="Gujarati", native_name="ગુજરાતી", script="Gujarati", is_regional=True),
    "pa": LanguageInfo(code="pa", name="Punjabi", native_name="ਪੰਜਾਬੀ", script="Gurmukhi", is_regional=True),
    "kn": LanguageInfo(code="kn", name="Kannada", native_name="ಕನ್ನಡ", script="Kannada", is_regional=True),
    "ml": LanguageInfo(code="ml", name="Malayalam", native_name="മലയാളം", script="Malayalam", is_regional=True),
    "es": LanguageInfo(code="es", name="Spanish", native_name="Español", script="Latin", is_regional=False),
    "fr": LanguageInfo(code="fr", name="French", native_name="Français", script="Latin", is_regional=False),
    "de": LanguageInfo(code="de", name="German", native_name="Deutsch", script="Latin", is_regional=False),
    "ru": LanguageInfo(code="ru", name="Russian", native_name="Русский", script="Cyrillic", is_regional=False),
    "ar": LanguageInfo(code="ar", name="Arabic", native_name="العربية", script="Arabic", is_regional=False),
    "en": LanguageInfo(code="en", name="English", native_name="English", script="Latin", is_regional=False),
}


def detect_language(text: str) -> LanguageInfo:
    """Accurately identify language and script of article text with zero network dependencies."""
    if not text or not text.strip():
        return LANGUAGE_REGISTRY["en"]

    normalized = unicodedata.normalize("NFKC", text)

    # 1. Script-based identification for Indic and Non-Latin scripts
    total_chars = len(normalized)
    
    odia_count = len(ODIA_RANGE.findall(normalized))
    if odia_count >= 5 or (total_chars > 0 and odia_count / max(total_chars, 1) > 0.08):
        return LANGUAGE_REGISTRY["or"]

    devanagari_count = len(DEVANAGARI_RANGE.findall(normalized))
    if devanagari_count >= 5 or (total_chars > 0 and devanagari_count / max(total_chars, 1) > 0.08):
        return LANGUAGE_REGISTRY["hi"]

    bengali_count = len(BENGALI_RANGE.findall(normalized))
    if bengali_count >= 5 or (total_chars > 0 and bengali_count / max(total_chars, 1) > 0.08):
        return LANGUAGE_REGISTRY["bn"]

    tamil_count = len(TAMIL_RANGE.findall(normalized))
    if tamil_count >= 5 or (total_chars > 0 and tamil_count / max(total_chars, 1) > 0.08):
        return LANGUAGE_REGISTRY["ta"]

    telugu_count = len(TELUGU_RANGE.findall(normalized))
    if telugu_count >= 5 or (total_chars > 0 and telugu_count / max(total_chars, 1) > 0.08):
        return LANGUAGE_REGISTRY["te"]

    gujarati_count = len(GUJARATI_RANGE.findall(normalized))
    if gujarati_count >= 5:
        return LANGUAGE_REGISTRY["gu"]

    punjabi_count = len(PUNJABI_RANGE.findall(normalized))
    if punjabi_count >= 5:
        return LANGUAGE_REGISTRY["pa"]

    kannada_count = len(KANNADA_RANGE.findall(normalized))
    if kannada_count >= 5:
        return LANGUAGE_REGISTRY["kn"]

    malayalam_count = len(MALAYALAM_RANGE.findall(normalized))
    if malayalam_count >= 5:
        return LANGUAGE_REGISTRY["ml"]

    cyrillic_count = len(CYRILLIC_RANGE.findall(normalized))
    if cyrillic_count >= 5:
        return LANGUAGE_REGISTRY["ru"]

    arabic_count = len(ARABIC_RANGE.findall(normalized))
    if arabic_count >= 5:
        return LANGUAGE_REGISTRY["ar"]

    # 2. Latin-script language identification via lexical token frequency
    words = re.findall(r"\b[^\W\d_]+\b", normalized.lower(), re.UNICODE)
    if not words:
        return LANGUAGE_REGISTRY["en"]

    word_set = set(words)
    
    en_score = len(word_set.intersection(ENGLISH_WORDS))
    es_score = len(word_set.intersection(SPANISH_WORDS))
    fr_score = len(word_set.intersection(FRENCH_WORDS))
    de_score = len(word_set.intersection(GERMAN_WORDS))

    # If common English vocabulary is prominent, it is English
    if en_score >= 2 and en_score >= max(es_score, fr_score, de_score):
        return LANGUAGE_REGISTRY["en"]

    if es_score >= 4 and es_score > en_score and es_score > fr_score and es_score > de_score:
        return LANGUAGE_REGISTRY["es"]
    if fr_score >= 4 and fr_score > en_score and fr_score > es_score and fr_score > de_score:
        return LANGUAGE_REGISTRY["fr"]
    if de_score >= 4 and de_score > en_score and de_score > es_score and de_score > fr_score:
        return LANGUAGE_REGISTRY["de"]

    return LANGUAGE_REGISTRY["en"]
