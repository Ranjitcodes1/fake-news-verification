from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.preprocessing.text import load_articles, leakage_aware_split


def dataset_profile(frame: pd.DataFrame) -> dict[str, object]:
    lengths = frame["text"].str.split().str.len()
    return {
        "rows": int(len(frame)),
        "class_counts": frame["label"].value_counts().to_dict(),
        "duplicate_cleaned_texts": int(frame["text_clean"].duplicated().sum()),
        "missing_headline": int(frame["headline"].eq("").sum()),
        "missing_content": int(frame["content"].eq("").sum()),
        "mean_word_count": float(lengths.mean()) if len(frame) else 0.0,
        "median_word_count": float(lengths.median()) if len(frame) else 0.0,
        "sources": frame["source"].value_counts().to_dict() if "source" in frame else {},
        "license_note": (
            "Default sample_articles.csv is a synthetic demo corpus for engineering. "
            "It is not LIAR or FakeNewsNet. Do not treat metrics as real-world accuracy."
        ),
    }


def prepare_splits(csv_path: Path) -> tuple[pd.DataFrame, dict[str, object]]:
    frame = load_articles(str(csv_path))
    splits = leakage_aware_split(frame)
    processed_dir = csv_path.parents[1] / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    splits.train.to_csv(processed_dir / "train.csv", index=False)
    splits.validation.to_csv(processed_dir / "validation.csv", index=False)
    splits.test.to_csv(processed_dir / "test.csv", index=False)
    profile = {
        "full": dataset_profile(frame),
        "train_rows": int(len(splits.train)),
        "validation_rows": int(len(splits.validation)),
        "test_rows": int(len(splits.test)),
    }
    return frame, profile
