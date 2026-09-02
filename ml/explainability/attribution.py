from __future__ import annotations

from typing import Any

import numpy as np


def top_tfidf_contributions(
    vectorizer,
    classifier,
    text_clean: str,
    top_k: int = 12,
) -> list[dict[str, Any]]:
    """Coefficient × TF-IDF value attribution for linear models."""
    matrix = vectorizer.transform([text_clean])
    feature_names = np.array(vectorizer.get_feature_names_out())
    if not hasattr(classifier, "coef_"):
        return []
    coef = classifier.coef_[0]
    values = matrix.toarray()[0]
    contributions = values * coef
    order = np.argsort(np.abs(contributions))[::-1]
    results: list[dict[str, Any]] = []
    for idx in order[:top_k]:
        if values[idx] <= 0:
            continue
        weight = float(contributions[idx])
        results.append(
            {
                "token": str(feature_names[idx]),
                "score": weight,
                "direction": "fake" if weight > 0 else "real",
                "influence": "high" if abs(weight) >= 0.08 else "medium" if abs(weight) >= 0.03 else "low",
            }
        )
    return results


def lime_or_shap_optional(model, text_clean: str) -> list[dict[str, Any]]:
    """Best-effort LIME explanation; returns empty list if extras are missing."""
    try:
        from lime.lime_text import LimeTextExplainer
    except Exception:
        return []
    if not hasattr(model, "predict_proba"):
        return []
    explainer = LimeTextExplainer(class_names=["real", "fake"])
    explanation = explainer.explain_instance(text_clean, model.predict_proba, num_features=8, num_samples=200)
    out = []
    for token, weight in explanation.as_list():
        out.append(
            {
                "token": token,
                "score": float(weight),
                "direction": "fake" if weight > 0 else "real",
                "method": "lime",
            }
        )
    return out
