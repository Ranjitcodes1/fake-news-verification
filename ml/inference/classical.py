from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from ml.explainability.attribution import lime_or_shap_optional, top_tfidf_contributions
from ml.preprocessing.text import clean_text, combine_headline_content

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL = ROOT / "models" / "baseline_tfidf_lr.joblib"
DEFAULT_METRICS = ROOT / "models" / "metrics.json"


class ClassicalInference:
    def __init__(self, model_path: Path = DEFAULT_MODEL, metrics_path: Path = DEFAULT_METRICS):
        self.model_path = model_path
        self.metrics_path = metrics_path
        self.pipeline = None
        self.metrics: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        if not self.model_path.exists():
            from ml.training.train_classical import train_and_evaluate

            train_and_evaluate()
        self.pipeline = joblib.load(self.model_path)
        if self.metrics_path.exists():
            self.metrics = json.loads(self.metrics_path.read_text(encoding="utf-8"))

    @property
    def model_version(self) -> str:
        return str(self.metrics.get("model_version", "classical-unspecified"))

    def predict(self, headline: str, content: str) -> dict[str, Any]:
        text = combine_headline_content(headline, content)
        cleaned = clean_text(text)
        if not cleaned:
            raise ValueError("Article text is empty after cleaning")
        fake_proba = self._fake_probability([cleaned])[0]
        real_proba = 1.0 - fake_proba
        vectorizer = self.pipeline.named_steps["tfidf"]
        classifier = self.pipeline.named_steps["clf"]
        attributions = top_tfidf_contributions(vectorizer, classifier, cleaned)
        lime = lime_or_shap_optional(self.pipeline, cleaned)
        return {
            "fake_probability": float(fake_proba),
            "real_probability": float(real_proba),
            "model_version": self.model_version,
            "backend": "sklearn_tfidf",
            "attributions": attributions,
            "optional_lime": lime,
            "cleaned_text": cleaned,
            "raw_text": text,
        }

    def _fake_probability(self, texts: list[str]) -> np.ndarray:
        model = self.pipeline
        if hasattr(model, "predict_proba"):
            return model.predict_proba(texts)[:, 1]
        scores = model.decision_function(texts)
        return 1.0 / (1.0 + np.exp(-scores))
