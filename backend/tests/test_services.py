from app.core.security import hash_password, validate_public_http_url, verify_password
from app.services.claims import extract_claims
from app.services.decision import verify_article
from app.services.prediction import apply_thresholds, get_inference_engine
from app.services.sources import classify_domain


def test_password_hashing():
    raw_password = "SecretPassword123!"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert hashed.startswith("pbkdf2_sha256$100000$")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_inference_engine_fallback():
    engine = get_inference_engine("auto")
    assert engine is not None


def test_thresholds():
    label, conf = apply_thresholds(0.91, 0.65, 0.65)
    assert label == "LIKELY_FAKE"
    assert conf == 0.91
    label, _ = apply_thresholds(0.2, 0.65, 0.65)
    assert label == "LIKELY_REAL"
    label, _ = apply_thresholds(0.5, 0.65, 0.65)
    assert label == "UNCERTAIN"


def test_claim_extraction():
    text = (
        "The ministry announced a new education policy in 2024. "
        "People like parks. Officials said funding will increase by 12 percent."
    )
    claims = extract_claims(text)
    assert claims
    assert any("education" in c["text"].lower() or "funding" in c["text"].lower() for c in claims)


def test_source_categories():
    assert classify_domain("https://www.reuters.com/world") == "ESTABLISHED_NEWS"
    assert classify_domain("https://www.cdc.gov/flu") in {"OFFICIAL", "RESEARCH_ORGANIZATION"}
    assert classify_domain("https://random-blog.example") == "UNKNOWN"


def test_ssrf_localhost_blocked():
    try:
        validate_public_http_url("http://127.0.0.1/secret")
        assert False, "expected failure"
    except ValueError:
        pass


def test_verify_fake_style_article():
    result = verify_article(
        "SHOCKING: 100% GUARANTEED miracle banks will seize savings at 3 AM",
        "BREAKING: They don't want you to know that a secret council will freeze every account overnight. Share before this is deleted!!!",
    )
    assert result["prediction"] in {"LIKELY_FAKE", "UNCERTAIN", "LIKELY_REAL"}
    assert 0 <= result["confidence"] <= 1
    assert result["model_version"]
    assert result["explanation"] is not None
