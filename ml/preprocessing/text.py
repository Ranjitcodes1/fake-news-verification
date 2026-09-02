from __future__ import annotations

import re
from dataclasses import dataclass

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, train_test_split

URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
WHITESPACE_RE = re.compile(r"\s+")
NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")


@dataclass(frozen=True)
class SplitFrames:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    lowered = text.lower()
    without_urls = URL_RE.sub(" ", lowered)
    alnum = NON_ALNUM_RE.sub(" ", without_urls)
    return WHITESPACE_RE.sub(" ", alnum).strip()


def combine_headline_content(headline: str, content: str) -> str:
    return f"{headline or ''} {content or ''}".strip()


def load_articles(csv_path: str) -> pd.DataFrame:
    frame = pd.read_csv(csv_path)
    required = {"headline", "content", "label"}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Dataset missing columns: {sorted(missing)}")
    frame = frame.copy()
    frame["headline"] = frame["headline"].fillna("").astype(str)
    frame["content"] = frame["content"].fillna("").astype(str)
    frame["label"] = frame["label"].str.lower().str.strip()
    frame = frame[frame["label"].isin(["real", "fake"])]
    frame["text"] = [
        combine_headline_content(h, c) for h, c in zip(frame["headline"], frame["content"])
    ]
    frame["text_clean"] = frame["text"].map(clean_text)
    frame["label_id"] = (frame["label"] == "fake").astype(int)
    frame = frame.drop_duplicates(subset=["text_clean"])
    frame = frame[frame["text_clean"].str.len() > 20]
    return frame.reset_index(drop=True)


def leakage_aware_split(
    frame: pd.DataFrame,
    *,
    test_size: float = 0.2,
    val_size: float = 0.1,
    random_state: int = 42,
) -> SplitFrames:
    """Split while keeping near-duplicate cleaned texts in the same split."""
    work = frame.copy()
    if "text_clean" not in work.columns:
        raise ValueError("Expected text_clean column")
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_val_idx, test_idx = next(splitter.split(work, groups=work["text_clean"]))
    train_val = work.iloc[train_val_idx]
    test = work.iloc[test_idx]
    relative_val = val_size / (1.0 - test_size)
    try:
        val_splitter = GroupShuffleSplit(
            n_splits=1, test_size=relative_val, random_state=random_state
        )
        train_idx, val_idx = next(val_splitter.split(train_val, groups=train_val["text_clean"]))
        train = train_val.iloc[train_idx]
        validation = train_val.iloc[val_idx]
    except ValueError:
        train, validation = train_test_split(
            train_val,
            test_size=relative_val,
            random_state=random_state,
            stratify=train_val["label_id"],
        )
    return SplitFrames(train=train.reset_index(drop=True), validation=validation.reset_index(drop=True), test=test.reset_index(drop=True))
