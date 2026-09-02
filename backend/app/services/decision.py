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


def verify_article(headline: str, content: str, source_url: str | None = None, model_type: str = "auto") -> dict:
    prediction = predict_article(headline, content, model_type=model_type)
    claims = []
    try:
        extracted = extract_claims(f"{headline}. {content}")
    except Exception:
        extracted = []
    all_evidence: list[dict] = []
    evidence_warning = None
    for claim in extracted:
        items, warning = retrieve_evidence(claim["text"])
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
    narrative = (
        f"The system assesses this article as {prediction['prediction'].replace('_', ' ').lower()} "
        f"based on the model prediction and available evidence. "
        "Influential tokens reflect stylistic associations in the trained model, not proof."
    )
    if evidence_warning:
        prediction["limitations"] = [evidence_warning, *prediction["limitations"]]

    return {
        **prediction,
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
