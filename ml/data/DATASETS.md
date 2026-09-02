# Dataset notes

## Default corpus: synthetic_demo

File: `ml/data/raw/sample_articles.csv`

- Purpose: local training, tests, and Docker smoke runs without downloading third-party corpora.
- Labels: `real` means straight-news style reporting; `fake` means sensational fabricated-style copy.
- These label definitions are **not** interchangeable with LIAR's pants-on-fire scale or FakeNewsNet's fact-check labels.
- License: generated for this repository; not a journalistic dataset.
- Metrics trained on this file must not be advertised as real-world fake-news detection performance.

Inspect before training: class balance, duplicates, missing values, and leakage-aware splits are implemented in `ml/preprocessing`.

## Optional corpora

If you add LIAR, FakeNewsNet, or a Kaggle set:

1. Record the license and citation in this file.
2. Do not mix incompatible fake/real definitions in one training run.
3. Re-run leakage-aware splits.
4. Store extra raw files under `ml/data/raw/` (gitignored except the sample CSV).
