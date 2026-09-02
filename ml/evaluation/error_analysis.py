from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def categorize_error(headline: str, content: str, true_label: str, pred_label: str) -> str:
    text = f"{headline} {content}".lower()
    if true_label == "real" and pred_label == "fake":
        if any(word in text for word in ("satire", "parody")):
            return "satire"
        if any(word in text for word in ("opinion", "editorial")):
            return "opinion"
        return "false_positive_style"
    if true_label == "fake" and pred_label == "real":
        if "breaking" not in text and "shocking" not in text:
            return "novel_or_dry_misinformation"
        return "false_negative"
    return "correct"


def write_error_report(predictions_csv: Path, output_json: Path) -> dict:
    frame = pd.read_csv(predictions_csv)
    frame["error_category"] = [
        categorize_error(h, c, t, p)
        for h, c, t, p in zip(frame["headline"], frame["content"], frame["true_label"], frame["pred_label"])
    ]
    summary = (
        frame.loc[frame["true_label"] != frame["pred_label"], "error_category"]
        .value_counts()
        .to_dict()
    )
    payload = {
        "misclassified_count": int((frame["true_label"] != frame["pred_label"]).sum()),
        "categories": summary,
        "examples": frame.loc[frame["true_label"] != frame["pred_label"]]
        .head(20)
        .to_dict(orient="records"),
        "notes": [
            "Error categories are heuristic tags for review, not ground-truth journalism labels.",
        ],
    }
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload
