from __future__ import annotations

import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import get_settings

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.inference.classical import ClassicalInference
from ml.inference.transformer import TransformerInference


DEFAULT_LIMITATIONS = [
    "This result is an AI-generated probabilistic assessment, not proof that an article is true or false.",
    "Model confidence is the model's certainty about its class, not the probability that a claim is objectively false.",
    "Truth cannot always be inferred from writing style.",
    "Breaking news may lack corroborating evidence.",
    "Articles can mix true and false claims.",
    "Satire can resemble misinformation.",
    "Models can inherit dataset biases.",
    "Search results may be incomplete; lack of results is not proof of falsity.",
    "Source category does not guarantee factual correctness.",
]


def apply_thresholds(fake_probability: float, fake_threshold: float, real_threshold: float) -> tuple[str, float]:
    real_probability = 1.0 - fake_probability
    if fake_probability >= fake_threshold and fake_probability >= real_probability:
        return "LIKELY_FAKE", fake_probability
    if real_probability >= real_threshold and real_probability > fake_probability:
        return "LIKELY_REAL", real_probability
    return "UNCERTAIN", max(fake_probability, real_probability)


@lru_cache
def get_classical_model() -> ClassicalInference:
    settings = get_settings()
    return ClassicalInference(
        model_path=Path(settings.model_path),
        metrics_path=Path(settings.metrics_path),
    )


@lru_cache
def get_transformer_model() -> TransformerInference:
    settings = get_settings()
    return TransformerInference(model_dir=Path(settings.distilbert_path))


def get_inference_engine(model_preference: str = "auto") -> Any:
    """Returns the requested model engine with robust fallback to classical TF-IDF."""
    if model_preference in ("distilbert", "transformer"):
        transformer = get_transformer_model()
        if transformer.is_ready:
            return transformer
    # For 'auto' or 'classical', prioritize the retrained benchmark model
    return get_classical_model()


def predict_article(headline: str, content: str, model_type: str = "auto") -> dict:
    settings = get_settings()
    
    if model_type in ("distilbert", "transformer"):
        inference = get_transformer_model() if get_transformer_model().is_ready else get_classical_model()
        raw = inference.predict(headline, content)
    elif model_type in ("classical", "tfidf"):
        inference = get_classical_model()
        raw = inference.predict(headline, content)
    else:  # "auto": evaluate retrained benchmark model; fallback/compare gracefully
        classical = get_classical_model()
        raw = classical.predict(headline, content)
        # If classical model probability is very close to 0.5 (within 0.05) and transformer is ready, cross-check
        c_margin = abs(raw["fake_probability"] - 0.5)
        if c_margin < 0.05 and get_transformer_model().is_ready:
            t_raw = get_transformer_model().predict(headline, content)
            t_margin = abs(t_raw["fake_probability"] - 0.5)
            if t_margin > c_margin:
                raw = t_raw

    from ml.preprocessing.languages import detect_language

    lang_info = detect_language(f"{headline} {content}")

    label, confidence = apply_thresholds(
        raw["fake_probability"],
        settings.predict_fake_threshold,
        settings.predict_real_threshold,
    )
    return {
        **raw,
        "prediction": label,
        "confidence": round(float(confidence), 4),
        "language": lang_info.code,
        "language_name": f"{lang_info.name} ({lang_info.native_name})" if lang_info.native_name != lang_info.name else lang_info.name,
        "limitations": DEFAULT_LIMITATIONS,
    }


def load_metrics() -> dict:
    path = Path(get_settings().metrics_path)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))
