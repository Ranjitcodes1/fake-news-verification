from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ROOT / ".env"), extra="ignore", protected_namespaces=())

    app_env: str = "development"
    app_name: str = "Veritas"
    app_secret_key: str = "change-me"
    database_url: str = "sqlite:///./veritas.db"
    model_path: str = str(ROOT / "models" / "baseline_tfidf_lr.joblib")
    vectorizer_path: str = str(ROOT / "models" / "tfidf_vectorizer.joblib")
    metrics_path: str = str(ROOT / "models" / "metrics.json")
    distilbert_path: str = str(ROOT / "models" / "distilbert")
    search_api_key: str = ""
    news_api_key: str = ""
    google_fact_check_api_key: str = ""
    jwt_secret: str = "change-me-jwt"
    jwt_expire_minutes: int = 1440
    frontend_url: str = "http://localhost:5173"
    backend_cors_origins: str = "http://localhost:5173,http://localhost:3000"
    max_article_chars: int = 20000
    max_headline_chars: int = 500
    predict_fake_threshold: float = 0.55
    predict_real_threshold: float = 0.55
    rate_limit_per_minute: int = 30
    request_timeout_seconds: int = 35

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.backend_cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
