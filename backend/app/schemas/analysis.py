from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class PredictRequest(BaseModel):
    headline: str = Field(..., min_length=3, max_length=500)
    content: str = Field(..., min_length=40, max_length=20000)
    model_type: str = Field(default="auto", description="'auto', 'classical', or 'distilbert'")
    source_url: str | None = Field(default=None, description="Optional public URL where this article was published")

    @field_validator("headline", "content")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank")
        return cleaned


class UrlAnalyzeRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=1000)
    headline: str | None = Field(default=None, max_length=500)
    model_type: str = Field(default="auto", description="'auto', 'classical', or 'distilbert'")


class BatchVerifyItem(BaseModel):
    headline: str = Field(..., min_length=3, max_length=500)
    content: str = Field(..., min_length=40, max_length=20000)
    source_url: str | None = None


class BatchVerifyRequest(BaseModel):
    items: list[BatchVerifyItem] = Field(..., min_length=1, max_length=20)
    model_type: str = Field(default="auto")


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    model_version: str
    backend: str = "sklearn_tfidf"
    language: str = "en"
    language_name: str = "English"
    disclaimer: str


class ClaimOut(BaseModel):
    text: str
    importance: float
    assessment: str = "inconclusive"
    confidence: float = 0.0
    evidence: list["EvidenceOut"] = Field(default_factory=list)


class EvidenceOut(BaseModel):
    source_name: str
    domain: str | None = None
    url: str
    title: str | None = None
    publication_date: str | None = None
    snippet: str
    source_type: str
    relevance_score: float
    supports_claim: bool | None = None
    stance: str


class AttributionOut(BaseModel):
    token: str
    score: float
    direction: str
    influence: str | None = None


class VerifyResponse(BaseModel):
    id: int | None = None
    prediction: str
    confidence: float
    model_version: str
    backend: str = "sklearn_tfidf"
    language: str = "en"
    language_name: str = "English"
    headline: str
    content: str
    source_url: str | None = None
    claims: list[ClaimOut]
    evidence: list[EvidenceOut]
    source_analysis: dict[str, Any]
    explanation: list[AttributionOut]
    limitations: list[str]
    narrative: str
    created_at: datetime | None = None
    disclaimer: str


class BatchVerifyResponse(BaseModel):
    total_processed: int
    results: list[VerifyResponse]


class HistoryItem(BaseModel):
    id: int
    headline: str
    prediction: str
    confidence: float
    language: str = "en"
    language_name: str = "English"
    created_at: datetime


class DashboardStats(BaseModel):
    total_analyses: int
    prediction_distribution: dict[str, int]
    recent: list[HistoryItem]
    confidence_buckets: dict[str, int]
    model_performance: dict[str, Any]
    daily_counts: list[dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    app: str
    model_loaded: bool
    transformer_available: bool = False
    database: str


ClaimOut.model_rebuild()
