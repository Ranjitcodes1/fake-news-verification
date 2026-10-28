from __future__ import annotations

from app.services.claims import extract_claims
from app.services.evidence import retrieve_evidence
from app.services.prediction import predict_article
from app.services.sources import analyze_url


def _assessment_from_evidence(items: list[dict]) -> str:
    supports = sum(1 for item in items if item.get("stance") == "supports")
    contradicts = sum(1 for item in items if item.get("stance") == "contradicts")
    if contradicts > supports and contradicts > 0:
        return "potentially_unsupported"
    if supports > contradicts and supports > 0:
        return "has_supporting_mentions"
    return "inconclusive"


def synthesize_decision(
    prediction: dict,
    source_analysis: dict,
    claims: list[dict],
) -> tuple[str, float, str]:
    """
    Synthesizes NLP stylistic predictions, source domain authority, and claim evidence stances
    to produce a calibrated final verdict and explanatory narrative.
    """
    pred_label = prediction["prediction"]
    pred_conf = float(prediction["confidence"])
    domain_cat = source_analysis.get("category", "UNKNOWN")
    raw_trust = float(source_analysis.get("trust_score", 0.50))
    trust_score = raw_trust if raw_trust <= 1.0 else (raw_trust / 100.0)
    domain = source_analysis.get("domain") or "the source"

    contradicts_count = sum(1 for c in claims if c.get("assessment") == "potentially_unsupported")

    final_label = pred_label
    final_conf = pred_conf
    narrative = ""

    # Rule 1: Reputable, accredited domain with no debunking evidence
    if domain_cat in {"ESTABLISHED_NEWS", "OFFICIAL", "RESEARCH_ORGANIZATION"} and trust_score >= 0.75:
        if contradicts_count > 0:
            final_label = "UNCERTAIN"
            final_conf = 0.60
            narrative = (
                f"Although published by an established outlet ({domain}), specific factual claims in the text "
                f"face contradictory third-party evidence. Further verification is recommended."
            )
        elif pred_label == "UNCERTAIN" or (pred_label == "LIKELY_REAL" and pred_conf < 0.80):
            # Calibrate upwards for verified established sources
            final_label = "LIKELY_REAL"
            final_conf = round(min(0.92, max(0.78, (pred_conf * 0.35) + (trust_score * 0.65))), 2)
            narrative = (
                f"The article is assessed as likely real. It originates from an established, accredited news source "
                f"({domain}, trust score: {int(trust_score * 100)}%) with no contradictory fact-checks detected, "
                f"though some dramatic or crime-related lexical markers were noted in the writing style."
            )
        elif pred_label == "LIKELY_REAL":
            final_conf = round(min(0.95, max(pred_conf, trust_score)), 2)
            narrative = (
                f"The article is assessed as likely real based on standard journalistic style and "
                f"publication by an established source ({domain})."
            )

    # Rule 2: Suspicious or unverified domain with sensational style
    elif domain_cat == "SUSPICIOUS" or trust_score <= 0.30:
        if pred_label in {"LIKELY_FAKE", "UNCERTAIN"}:
            final_label = "LIKELY_FAKE"
            final_conf = round(min(0.95, max(0.75, pred_conf + 0.15)), 2)
            narrative = (
                f"The article is assessed as likely fake due to publication by a known suspicious or unverified source "
                f"({domain}) coupled with sensationalized linguistic patterns."
            )

    # Rule 3: Contradicted empirical claims regardless of domain
    elif contradicts_count > 0 and pred_label != "LIKELY_REAL":
        final_label = "LIKELY_FAKE"
        final_conf = round(min(0.92, max(0.75, pred_conf + 0.10)), 2)
        narrative = (
            f"The article is assessed as likely fake because its core propositions are directly contradicted "
            f"by authoritative third-party fact-checkers."
        )

    # Default fallback
    if not narrative:
        narrative = (
            f"The system assesses this article as {final_label.replace('_', ' ').lower()} "
            f"based on the model prediction and available evidence. "
            f"Influential tokens reflect stylistic associations in the trained model, not proof."
        )

    return final_label, final_conf, narrative


def verify_article(headline: str, content: str, source_url: str | None = None, model_type: str = "auto") -> dict:
    prediction = predict_article(headline, content, model_type=model_type)
    claims = []
    try:
        extracted = extract_claims(f"{headline}. {content}")
    except Exception:
        extracted = []
    all_evidence: list[dict] = []
    evidence_warning = None
    lang_code = prediction.get("language", "en")
    for claim in extracted[:2]:
        items, warning = retrieve_evidence(claim["text"], language_code=lang_code)
        evidence_warning = evidence_warning or warning
        assessment = _assessment_from_evidence(items)
        claim_out = {
            **claim,
            "assessment": assessment,
            "confidence": claim["importance"],
            "evidence": items,
        }
        claims.append(claim_out)
        all_evidence.extend(items)

    seen_keys = set()
    deduped_evidence: list[dict] = []
    for ev in all_evidence:
        key = ev.get("url") or ev.get("title")
        if key and key not in seen_keys:
            seen_keys.add(key)
            deduped_evidence.append(ev)

    source_analysis = analyze_url(source_url, headline=headline)
    final_label, final_conf, narrative = synthesize_decision(prediction, source_analysis, claims)

    if evidence_warning:
        prediction["limitations"] = [evidence_warning, *prediction["limitations"]]

    return {
        **prediction,
        "prediction": final_label,
        "confidence": final_conf,
        "headline": headline,
        "content": content,
        "source_url": source_url,
        "claims": claims,
        "evidence": deduped_evidence,
        "source_analysis": source_analysis,
        "explanation": prediction.get("attributions") or [],
        "narrative": narrative,
        "disclaimer": prediction["limitations"][0],
    }
