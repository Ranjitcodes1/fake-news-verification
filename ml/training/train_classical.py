from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from ml.preprocessing.pipeline import prepare_splits
from ml.preprocessing.text import load_articles

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_CSV = ROOT / "ml" / "data" / "raw" / "sample_articles.csv"
BENCHMARK_CSV = ROOT / "ml" / "data" / "raw" / "benchmark_articles.csv"
MODELS_DIR = ROOT / "models"


def _metrics(y_true, y_pred, y_score) -> dict[str, float]:
    out: dict[str, float] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    try:
        out["roc_auc"] = float(roc_auc_score(y_true, y_score))
    except ValueError:
        out["roc_auc"] = float("nan")
    return out


def build_models() -> dict[str, Pipeline]:
    tfidf_params = dict(
        max_features=35000,
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
        strip_accents="unicode",
    )
    return {
        "logistic_regression": Pipeline(
            [
                ("tfidf", TfidfVectorizer(**tfidf_params)),
                (
                    "clf",
                    LogisticRegression(
                        C=2.0,
                        max_iter=1500,
                        class_weight="balanced",
                        random_state=42,
                        solver="lbfgs",
                    ),
                ),
            ]
        ),
        "naive_bayes": Pipeline(
            [
                ("tfidf", TfidfVectorizer(**tfidf_params)),
                ("clf", MultinomialNB(alpha=0.05)),
            ]
        ),
        "svm": Pipeline(
            [
                ("tfidf", TfidfVectorizer(**tfidf_params)),
                ("clf", LinearSVC(C=1.2, class_weight="balanced", random_state=42)),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("tfidf", TfidfVectorizer(**tfidf_params)),
                (
                    "clf",
                    RandomForestClassifier(
                        n_estimators=250,
                        random_state=42,
                        class_weight="balanced",
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def decision_scores(model: Pipeline, texts: list[str]):
    if hasattr(model, "predict_proba"):
        return model.predict_proba(texts)[:, 1]
    scores = model.decision_function(texts)
    # squash SVM scores to 0-1 for ranking/AUC only
    import numpy as np

    return 1.0 / (1.0 + np.exp(-scores))


def train_and_evaluate(csv_path: Path | None = None) -> dict[str, object]:
    if csv_path is None:
        if BENCHMARK_CSV.exists():
            csv_path = BENCHMARK_CSV
        else:
            try:
                from ml.preprocessing.fetch_real_dataset import build_comprehensive_benchmark
                csv_path = build_comprehensive_benchmark()
            except Exception:
                csv_path = SAMPLE_CSV

    if not csv_path.exists():
        from ml.preprocessing.generate_sample import write_sample
        write_sample(csv_path)

    _, profile = prepare_splits(csv_path)
    processed = csv_path.parents[1] / "processed"
    train = pd.read_csv(processed / "train.csv")
    validation = pd.read_csv(processed / "validation.csv")
    test = pd.read_csv(processed / "test.csv")

    comparison: dict[str, object] = {}
    best_name = None
    best_f1 = -1.0
    best_model: Pipeline | None = None

    for name, model in build_models().items():
        started = time.perf_counter()
        model.fit(train["text_clean"], train["label_id"])
        elapsed = time.perf_counter() - started
        val_pred = model.predict(validation["text_clean"])
        val_score = decision_scores(model, validation["text_clean"].tolist())
        test_pred = model.predict(test["text_clean"])
        test_score = decision_scores(model, test["text_clean"].tolist())
        val_metrics = _metrics(validation["label_id"], val_pred, val_score)
        test_metrics = _metrics(test["label_id"], test_pred, test_score)
        comparison[name] = {
            "validation": val_metrics,
            "test": test_metrics,
            "training_seconds": round(elapsed, 4),
            "confusion_matrix_test": confusion_matrix(test["label_id"], test_pred).tolist(),
        }
        if val_metrics["f1"] > best_f1:
            best_f1 = val_metrics["f1"]
            best_name = name
            best_model = model

    if best_model is None or best_name is None:
        raise RuntimeError("Training produced no model")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    artifact = MODELS_DIR / "baseline_tfidf_lr.joblib"
    # Keep a stable production filename even if another classical model wins.
    joblib.dump(best_model, artifact)
    joblib.dump(best_model, MODELS_DIR / f"{best_name}.joblib")
    vectorizer = best_model.named_steps["tfidf"]
    joblib.dump(vectorizer, MODELS_DIR / "tfidf_vectorizer.joblib")

    payload = {
        "dataset_profile": profile,
        "dataset_file": csv_path.name,
        "best_model": best_name,
        "model_version": f"{best_name}-v1",
        "artifact": str(artifact.relative_to(ROOT)),
        "comparison": comparison,
        "label_mapping": {"real": 0, "fake": 1},
        "notes": [
            f"Trained on {csv_path.name} with leakage-aware train/val/test splits.",
            "Confidence scores are probabilistic class estimates.",
        ],
    }
    metrics_path = MODELS_DIR / "metrics.json"
    metrics_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


if __name__ == "__main__":
    import sys
    custom_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    result = train_and_evaluate(custom_path)
    print(json.dumps({"best_model": result["best_model"], "dataset": result["dataset_file"], "comparison": result["comparison"]}, indent=2))

