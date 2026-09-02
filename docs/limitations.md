# Veritas Limitations and Methodology Disclosures

Veritas is designed as a **probabilistic decision-support assistant**, not an objective truth oracle. Misinformation detection on open-domain text is subject to significant inherent epistemic and technical boundaries.

---

## 1. Probabilistic Assessment vs. Ground Truth

- **Classification Confidence**: When Veritas reports an assessment (such as `LIKELY_REAL` with 84% confidence or `LIKELY_FAKE` with 91% confidence), this number represents the model’s internal statistical certainty relative to its training distribution. It is **not** a mathematical proof that a statement is true or false.
- **Three-Tier Calibration**: Predictions with balanced probabilities (e.g. between 45% and 55% fake/real) are intentionally classified as **`UNCERTAIN`** rather than forced into a binary label.

---

## 2. Stylistic Signals vs. Factual Correctness

- **Style-Based Artifacts**: NLP models primarily evaluate lexical choices, emotional polarity, punctuation density, and sentence structure. Sensational headlines or inflammatory adjectives (e.g., *"SHOCKING"*, *"SECRET LEAK"*) heavily shift model weights toward `LIKELY_FAKE`.
- **Accurate Tabloids vs. Dry Misinformation**:
  - A legitimate breaking news event reported in a sensationalized or tabloid writing style may trigger false positive fake-news flags.
  - A fabricated or fraudulent claim written in calm, academic, or institutional prose may evade style-based detectors (false negative).

---

## 3. Evidence Retrieval and Real-World Latency

- **Absence of Evidence is Not Evidence of Absence**: If live search or fact-checking APIs return zero matching articles for a claim, this may simply mean the event occurred very recently, is hyper-local, or has not yet been indexed. It must not be treated as proof of falsity.
- **Provider Outages**: When external fact-check APIs (Google Fact Check Tools, NewsAPI) encounter rate limits or network degradation, Veritas falls back to live public search feeds and local knowledge indexes, marking caveats in the limitations list.

---

## 4. Nuances in Content Types

- **Satire & Parody**: Satirical news (e.g., *The Onion*, *Babylon Bee*) deliberately mimics news formatting with absurd premises. Machine learning classifiers frequently classify satire as fake news unless domain-specific contextual priors are applied.
- **Opinion, Commentary & Editorials**: Subjective arguments, political commentary, and predictions about the future are non-verifiable propositions that standard fact-checking pipelines cannot strictly prove true or false.
- **Mixed-Truth Articles**: Many viral articles combine 90% verifiable facts with 10% misleading spin. The sentence-level claim extractor highlights individual propositions to help users verify discrete assertions.

---

## 5. Source Classification Categorization

- **Domain Category vs. Accuracy**: Domains are categorized broadly (`OFFICIAL`, `ESTABLISHED_NEWS`, `RESEARCH_ORGANIZATION`, `SUSPICIOUS`, `UNKNOWN`) based on organizational registry.
- Established outlets can still report premature or unverified information, and independent blogs can publish groundbreaking original reporting. Source category is context, not a verdict.

---

## 6. Recommendations for Users and Journalists

1. **Verify primary sources**: Always follow cited links to original documentation, press releases, or research papers.
2. **Review discrete claims**: Focus on individual extracted assertions rather than the aggregate score alone.
3. **Inspect token attributions**: Check which specific words or phrases swayed the model’s classification score.
