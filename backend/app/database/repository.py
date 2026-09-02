from __future__ import annotations

import json
from collections import Counter
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.session import Analysis, Claim, Evidence, ModelVersion, User


def create_user(db: Session, email: str, plain_password: str) -> User:
    user = User(
        email=email.strip().lower(),
        password_hash=hash_password(plain_password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def save_verification(db: Session, payload: dict, user_id: int | None = None) -> Analysis:
    analysis = Analysis(
        user_id=user_id,
        headline=payload["headline"],
        content=payload["content"],
        source_url=payload.get("source_url"),
        prediction=payload["prediction"],
        confidence=payload["confidence"],
        model_version=payload["model_version"],
        explanation_json=json.dumps(payload.get("explanation") or []),
        limitations_json=json.dumps(payload.get("limitations") or []),
        source_analysis_json=json.dumps(payload.get("source_analysis") or {}),
    )
    db.add(analysis)
    db.flush()
    for claim in payload.get("claims") or []:
        row = Claim(
            analysis_id=analysis.id,
            claim_text=claim["text"],
            assessment=claim.get("assessment") or "inconclusive",
            confidence=float(claim.get("confidence") or 0),
            importance=float(claim.get("importance") or 0),
        )
        db.add(row)
        db.flush()
        for item in claim.get("evidence") or []:
            db.add(
                Evidence(
                    claim_id=row.id,
                    source_name=item.get("source_name") or "unknown",
                    source_url=item.get("url") or "",
                    source_type=item.get("source_type") or "UNKNOWN",
                    snippet=item.get("snippet") or "",
                    relevance_score=float(item.get("relevance_score") or 0),
                    supports_claim=item.get("supports_claim"),
                    publication_date=item.get("publication_date"),
                )
            )
    db.commit()
    db.refresh(analysis)
    return analysis


def get_analysis(db: Session, analysis_id: int) -> Analysis | None:
    return db.get(Analysis, analysis_id)


def list_analyses(
    db: Session,
    *,
    q: str | None = None,
    prediction: str | None = None,
    user_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Analysis]:
    stmt = select(Analysis).order_by(Analysis.created_at.desc())
    if user_id is not None:
        stmt = stmt.where(Analysis.user_id == user_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Analysis.headline.ilike(like))
    if prediction:
        stmt = stmt.where(Analysis.prediction == prediction)
    return list(db.scalars(stmt.offset(offset).limit(limit)))


def delete_analysis(db: Session, analysis_id: int, user_id: int | None = None) -> bool:
    row = db.get(Analysis, analysis_id)
    if not row:
        return False
    if user_id is not None and row.user_id != user_id:
        return False
    db.delete(row)
    db.commit()
    return True


def dashboard(db: Session, user_id: int | None = None) -> dict:
    stmt = select(Analysis).order_by(Analysis.created_at.desc())
    if user_id is not None:
        stmt = stmt.where(Analysis.user_id == user_id)
    rows = list(db.scalars(stmt))
    dist = Counter(row.prediction for row in rows)
    buckets = {"0-50": 0, "50-70": 0, "70-85": 0, "85-100": 0}
    daily: Counter[str] = Counter()
    for row in rows:
        pct = row.confidence * 100
        if pct < 50:
            buckets["0-50"] += 1
        elif pct < 70:
            buckets["50-70"] += 1
        elif pct < 85:
            buckets["70-85"] += 1
        else:
            buckets["85-100"] += 1
        daily[row.created_at.date().isoformat()] += 1
    recent = [
        {
            "id": row.id,
            "headline": row.headline,
            "prediction": row.prediction,
            "confidence": row.confidence,
            "created_at": row.created_at,
        }
        for row in rows[:8]
    ]
    return {
        "total_analyses": len(rows),
        "prediction_distribution": dict(dist),
        "recent": recent,
        "confidence_buckets": buckets,
        "daily_counts": [{"date": day, "count": count} for day, count in sorted(daily.items())],
    }


def upsert_model_version(db: Session, metrics: dict) -> None:
    if not metrics:
        return
    version = str(metrics.get("model_version") or "unknown")
    existing = db.scalar(select(ModelVersion).where(ModelVersion.version == version))
    if existing:
        return
    best = metrics.get("best_model")
    comparison = (metrics.get("comparison") or {}).get(best or "", {})
    test = comparison.get("test") or {}
    db.add(
        ModelVersion(
            model_name=str(best or "unknown"),
            version=version,
            accuracy=test.get("accuracy"),
            precision=test.get("precision"),
            recall=test.get("recall"),
            f1=test.get("f1"),
        )
    )
    db.commit()
