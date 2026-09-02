from __future__ import annotations

import json
import time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from ml.preprocessing.generate_sample import write_sample
from ml.preprocessing.pipeline import prepare_splits
from ml.preprocessing.text import clean_text, combine_headline_content, load_articles
from ml.training.train_classical import build_models

ROOT = Path(__file__).resolve().parents[2]
RAW_DATA = ROOT / "ml" / "data" / "raw" / "sample_articles.csv"
PROCESSED_DIR = ROOT / "ml" / "data" / "processed"
MODELS_DIR = ROOT / "models"


def run_comprehensive_benchmark():
    print("=" * 85)
    print("           VERITAS MODEL ACCURACY & PRECISION BENCHMARK REPORT           ")
    print("=" * 85)

    if not RAW_DATA.exists():
        print("Generating standard corpus...")
        write_sample(RAW_DATA)

    # 1. Load and prepare dataset splits
    print("\n[1/4] Preparing Leakage-Aware Stratified Dataset Splits...")
    frame, profile = prepare_splits(RAW_DATA)
    real_count = (frame["label"] == "real").sum()
    fake_count = (frame["label"] == "fake").sum()
    print(f"Total Dataset Rows: {len(frame)} (Real: {real_count}, Fake: {fake_count})")

    train_df = pd.read_csv(PROCESSED_DIR / "train.csv")
    val_df = pd.read_csv(PROCESSED_DIR / "validation.csv")
    test_df = pd.read_csv(PROCESSED_DIR / "test.csv")

    print(f"Training Set: {len(train_df)} rows | Validation Set: {len(val_df)} rows | Test Set: {len(test_df)} rows")

    X_train = train_df["text_clean"].tolist()
    y_train = train_df["label_id"].to_numpy()

    X_test = test_df["text_clean"].tolist()
    y_test = test_df["label_id"].to_numpy()

    # 2. Train & Evaluate Models
    print("\n[2/4] Evaluating Classifiers on Held-Out Test Set (32 Unseen Articles)...")
    models = build_models()
    results = {}

    for name, pipeline in models.items():
        t0 = time.perf_counter()
        pipeline.fit(X_train, y_train)
        fit_time = time.perf_counter() - t0

        # Inference speed test
        t1 = time.perf_counter()
        preds = pipeline.predict(X_test)
        infer_time = (time.perf_counter() - t1) / len(X_test) * 1000  # ms per sample

        # Score probabilities
        if hasattr(pipeline, "predict_proba"):
            scores = pipeline.predict_proba(X_test)[:, 1]
        else:
            decision = pipeline.decision_function(X_test)
            scores = 1.0 / (1.0 + np.exp(-decision))

        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds, zero_division=0)
        f1 = f1_score(y_test, preds, zero_division=0)
        try:
            auc = roc_auc_score(y_test, scores)
        except Exception:
            auc = float("nan")

        cm = confusion_matrix(y_test, preds)

        results[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1": float(f1),
            "roc_auc": float(auc),
            "confusion_matrix": cm.tolist(),
            "train_time_sec": round(fit_time, 4),
            "latency_ms_per_sample": round(infer_time, 3),
        }

    # 3. Print Results Table
    print("\n" + "=" * 90)
    print(f"{'Model Name':<22} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'ROC-AUC':<9} | {'Latency':<8}")
    print("-" * 90)

    for name, m in results.items():
        auc_str = f"{m['roc_auc'] * 100:.2f}%" if not np.isnan(m['roc_auc']) else "N/A"
        print(
            f"{name:<22} | "
            f"{m['accuracy'] * 100:>8.2f}% | "
            f"{m['precision'] * 100:>8.2f}% | "
            f"{m['recall'] * 100:>8.2f}% | "
            f"{m['f1'] * 100:>8.2f}% | "
            f"{auc_str:>9} | "
            f"{m['latency_ms_per_sample']:>5.2f}ms"
        )
    print("=" * 90)

    # 4. Detailed Breakdown of Production Model (Logistic Regression)
    best_model_name = "logistic_regression"
    best_m = results[best_model_name]
    cm = np.array(best_m["confusion_matrix"])
    tn, fp, fn, tp = cm.ravel()

    print(f"\n[3/4] Diagnostic Confusion Matrix for Production Model ({best_model_name}):")
    print(f"  • True Positives (Actual Fake correctly flagged as Fake): {tp} / {tp + fn}")
    print(f"  • True Negatives (Actual Real correctly flagged as Real): {tn} / {tn + fp}")
    print(f"  • False Positives (Real article falsely marked as Fake):   {fp}")
    print(f"  • False Negatives (Fake article missed, marked as Real):   {fn}")

    # 5. Stress Testing Real-World Boundary & Adversarial Cases
    print("\n[4/4] Stress-Testing Model on Real-World Edge & Adversarial Test Cases:")
    prod_pipeline = models[best_model_name]

    boundary_cases = [
        {
            "headline": "WHO releases updated global guidelines for seasonal influenza surveillance",
            "content": "The World Health Organization announced revised epidemiological benchmarks on Friday to assist national laboratories in tracking influenza lineage changes across the hemisphere.",
            "expected": "Real (0)",
            "type": "Standard Official News",
        },
        {
            "headline": "SHOCKING: Secret government executive order will confiscate all savings at midnight",
            "content": "An emergency leak from elite insiders revealed that all bank accounts are scheduled for automatic confiscation tonight. Share before censors take this down!",
            "expected": "Fake (1)",
            "type": "Sensational Clickbait Disinformation",
        },
        {
            "headline": "Area Man Courageously Conquers Laundry Mountain After 3-Month Siege",
            "content": "Local resident Dave Higgins declared complete victory today after finally washing the enormous heap of clothing residing in the corner of his bedroom since November.",
            "expected": "Satire / Neutral Style",
            "type": "Satire / Parody Article",
        },
        {
            "headline": "James Webb Space Telescope detects methane signature on distant exoplanet",
            "content": "Astrophysicists analyzing infrared transmission spectra have published findings showing methane and carbon dioxide in the atmosphere of K2-18b, situated 120 light years away.",
            "expected": "Real (0)",
            "type": "Technical Scientific Press",
        },
    ]

    print("-" * 90)
    for i, case in enumerate(boundary_cases, 1):
        text = combine_headline_content(case["headline"], case["content"])
        cleaned = clean_text(text)
        prob_fake = prod_pipeline.predict_proba([cleaned])[0, 1]
        pred_label = "LIKELY_FAKE" if prob_fake >= 0.55 else "LIKELY_REAL" if prob_fake <= 0.45 else "UNCERTAIN"
        confidence = prob_fake if prob_fake >= 0.5 else (1.0 - prob_fake)

        print(f"Case {i} [{case['type']}]:")
        print(f"  Headline:    \"{case['headline']}\"")
        print(f"  Assessment:  {pred_label} (Confidence: {confidence * 100:.1f}%, Raw Fake-Score: {prob_fake:.3f})")
        print(f"  Expected:    {case['expected']}")
        print()

    print("=" * 85)
    print("Benchmark complete. All evaluation passes executed cleanly.")
    print("=" * 85)


if __name__ == "__main__":
    run_comprehensive_benchmark()
