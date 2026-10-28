from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, verify_password
from app.database.repository import (
    create_user,
    dashboard,
    delete_analysis,
    get_analysis,
    get_user_by_email,
    get_user_by_id,
    list_analyses,
    save_verification,
)
from app.database.session import User, get_db
from app.schemas.analysis import (
    BatchVerifyItem,
    BatchVerifyRequest,
    BatchVerifyResponse,
    ClaimOut,
    DashboardStats,
    HistoryItem,
    PredictRequest,
    PredictResponse,
    UrlAnalyzeRequest,
    VerifyResponse,
)
from app.schemas.auth import TokenResponse, UserLoginRequest, UserOut, UserRegisterRequest
from app.services.claims import extract_claims
from app.services.decision import verify_article
from app.services.evidence import retrieve_evidence
from app.services.prediction import get_transformer_model, load_metrics, predict_article
from app.services.url_fetch import fetch_article_from_url

router = APIRouter()

DISCLAIMER = (
    "This result is an AI-generated assessment and should not be treated as definitive proof "
    "that a claim is true or false."
)


def get_optional_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User | None:
    """Extract authenticated user if Authorization header is provided, else returns None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    try:
        user_id = int(payload["sub"])
        return get_user_by_id(db, user_id)
    except Exception:
        return None


def get_current_user(
    user: User | None = Depends(get_optional_current_user),
) -> User:
    """Dependency that enforces active authentication."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _verify_response(payload: dict, analysis_id: int | None = None, created_at=None) -> VerifyResponse:
    claims = []
    for claim in payload.get("claims") or []:
        evidence = []
        for item in claim.get("evidence") or []:
            evidence.append(
                {
                    "source_name": item.get("source_name"),
                    "domain": item.get("domain"),
                    "url": item.get("url") or "",
                    "title": item.get("title"),
                    "publication_date": item.get("publication_date"),
                    "snippet": item.get("snippet") or "",
                    "source_type": item.get("source_type") or "UNKNOWN",
                    "relevance_score": item.get("relevance_score") or 0,
                    "supports_claim": item.get("supports_claim"),
                    "stance": item.get("stance") or "inconclusive",
                }
            )
        claims.append(
            {
                "text": claim["text"],
                "importance": claim.get("importance") or 0,
                "assessment": claim.get("assessment") or "inconclusive",
                "confidence": claim.get("confidence") or 0,
                "evidence": evidence,
            }
        )
    from ml.preprocessing.languages import detect_language

    text_to_detect = f"{payload.get('headline') or ''} {payload.get('content') or ''}"
    lang_info = detect_language(text_to_detect)
    lang_code = payload.get("language") or lang_info.code
    lang_name = payload.get("language_name") or (f"{lang_info.name} ({lang_info.native_name})" if lang_info.native_name != lang_info.name else lang_info.name)

    return VerifyResponse(
        id=analysis_id,
        prediction=payload["prediction"],
        confidence=payload["confidence"],
        model_version=payload["model_version"],
        backend=payload.get("backend") or "sklearn_tfidf",
        language=lang_code,
        language_name=lang_name,
        headline=payload.get("headline") or "",
        content=payload.get("content") or "",
        source_url=payload.get("source_url"),
        claims=claims,
        evidence=[item for claim in claims for item in claim["evidence"]],
        source_analysis=payload.get("source_analysis") or {},
        explanation=payload.get("explanation") or [],
        limitations=payload.get("limitations") or [DISCLAIMER],
        narrative=payload.get("narrative") or "",
        created_at=created_at,
        disclaimer=DISCLAIMER,
    )


# --- Authentication Routes ---

@router.post("/auth/register", response_model=TokenResponse)
def register(body: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = create_user(db, email=body.email, plain_password=body.password)
    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/auth/login", response_model=TokenResponse)
def login(body: UserLoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


# --- Verification Routes ---

@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    try:
        result = predict_article(body.headline, body.content, model_type=body.model_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PredictResponse(
        prediction=result["prediction"],
        confidence=result["confidence"],
        model_version=result["model_version"],
        backend=result.get("backend", "sklearn_tfidf"),
        language=result.get("language", "en"),
        language_name=result.get("language_name", "English"),
        disclaimer=DISCLAIMER,
    )


@router.post("/verify", response_model=VerifyResponse)
def verify(
    body: PredictRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    try:
        payload = verify_article(body.headline, body.content, source_url=body.source_url, model_type=body.model_type)
        row = save_verification(db, payload, user_id=user.id if user else None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _verify_response(payload, analysis_id=row.id, created_at=row.created_at)


@router.post("/analyze-url", response_model=VerifyResponse)
def analyze_url(
    body: UrlAnalyzeRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    try:
        fetched = fetch_article_from_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502,
            detail="Could not fetch that URL. The site may be blocking automated readers or requires subscription. Paste the article text directly.",
        ) from exc
    headline = (body.headline or fetched.get("headline") or "Untitled").strip()
    payload = verify_article(headline, fetched["content"], source_url=fetched["url"], model_type=body.model_type)

    # Attach rich extracted metadata from the live URL
    source_analysis = payload.get("source_analysis") or {}
    source_analysis["publisher"] = fetched.get("publisher")
    source_analysis["published_date"] = fetched.get("published_date")
    source_analysis["image_url"] = fetched.get("image_url")
    source_analysis["author"] = fetched.get("author")
    payload["source_analysis"] = source_analysis

    row = save_verification(db, payload, user_id=user.id if user else None)
    return _verify_response(payload, analysis_id=row.id, created_at=row.created_at)



@router.post("/verify-batch", response_model=BatchVerifyResponse)
def verify_batch(
    body: BatchVerifyRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    results: list[VerifyResponse] = []
    for item in body.items:
        try:
            payload = verify_article(item.headline, item.content, source_url=item.source_url, model_type=body.model_type)
            row = save_verification(db, payload, user_id=user.id if user else None)
            results.append(_verify_response(payload, analysis_id=row.id, created_at=row.created_at))
        except Exception:
            continue
    return BatchVerifyResponse(total_processed=len(results), results=results)


@router.post("/claims")
def claims_only(body: PredictRequest):
    return {"claims": extract_claims(f"{body.headline}. {body.content}")}


@router.post("/evidence")
def evidence_only(body: PredictRequest):
    claims = extract_claims(f"{body.headline}. {body.content}")
    bundled = []
    warning = None
    for claim in claims[:3]:
        items, warn = retrieve_evidence(claim["text"])
        warning = warning or warn
        bundled.append({"claim": claim["text"], "evidence": items})
    return {"results": bundled, "warning": warning}


@router.get("/history", response_model=list[HistoryItem])
def history(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
    q: str | None = None,
    prediction: str | None = None,
    only_mine: bool = False,
):
    user_filter = user.id if (user and only_mine) else None
    rows = list_analyses(db, q=q, prediction=prediction, user_id=user_filter)
    history_items = []
    from ml.preprocessing.languages import detect_language
    for row in rows:
        lang_info = detect_language(row.headline or "")
        history_items.append(
            HistoryItem(
                id=row.id,
                headline=row.headline,
                prediction=row.prediction,
                confidence=row.confidence,
                language=lang_info.code,
                language_name=f"{lang_info.name} ({lang_info.native_name})" if lang_info.native_name != lang_info.name else lang_info.name,
                created_at=row.created_at,
            )
        )
    return history_items


@router.get("/analysis/{analysis_id}", response_model=VerifyResponse)
def analysis_detail(analysis_id: int, db: Session = Depends(get_db)):
    row = get_analysis(db, analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")
    claims_payload = []
    for claim in row.claims:
        claims_payload.append(
            {
                "text": claim.claim_text,
                "importance": claim.importance,
                "assessment": claim.assessment,
                "confidence": claim.confidence,
                "evidence": [
                    {
                        "source_name": ev.source_name,
                        "domain": None,
                        "url": ev.source_url,
                        "title": None,
                        "publication_date": ev.publication_date,
                        "snippet": ev.snippet,
                        "source_type": ev.source_type,
                        "relevance_score": ev.relevance_score,
                        "supports_claim": ev.supports_claim,
                        "stance": (
                            "supports"
                            if ev.supports_claim is True
                            else "contradicts"
                            if ev.supports_claim is False
                            else "inconclusive"
                        ),
                    }
                    for ev in claim.evidence
                ],
            }
        )
    payload = {
        "prediction": row.prediction,
        "confidence": row.confidence,
        "model_version": row.model_version,
        "headline": row.headline,
        "content": row.content,
        "source_url": row.source_url,
        "claims": claims_payload,
        "source_analysis": json.loads(row.source_analysis_json or "{}"),
        "explanation": json.loads(row.explanation_json or "[]"),
        "limitations": json.loads(row.limitations_json or "[]"),
        "narrative": (
            f"The system assesses this article as {row.prediction.replace('_', ' ').lower()} "
            "based on the model prediction and available evidence."
        ),
    }
    return _verify_response(payload, analysis_id=row.id, created_at=row.created_at)


@router.delete("/analysis/{analysis_id}")
def remove_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    user_id = user.id if user else None
    if not delete_analysis(db, analysis_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Analysis not found or permission denied")
    return {"ok": True}


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_current_user),
):
    stats = dashboard(db, user_id=user.id if user else None)
    metrics = load_metrics()
    best = metrics.get("best_model")
    test = ((metrics.get("comparison") or {}).get(best or "") or {}).get("test") or {}
    stats["model_performance"] = {
        "model": best,
        "version": metrics.get("model_version"),
        "test": test,
        "caveat": "Metrics are from the training corpus documented in ml/data/DATASETS.md.",
    }
    return stats
