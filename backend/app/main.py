from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.v1.routes import router as v1_router
from app.core.config import get_settings
from app.database.repository import upsert_model_version
from app.database.session import SessionLocal, init_db
from app.schemas.analysis import HealthResponse
from app.services.prediction import get_classical_model, get_transformer_model, load_metrics

settings = get_settings()
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    get_classical_model()
    db = SessionLocal()
    try:
        upsert_model_version(db, load_metrics())
    finally:
        db.close()
    yield


app = FastAPI(
    title="Veritas Fake News Verification API",
    version="0.1.0",
    description="Probabilistic fake-news assessment API. Not a truth oracle.",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(v1_router, prefix="/api/v1")


@app.get("/api/v1/health", response_model=HealthResponse)
def health():
    model_ok = True
    try:
        get_classical_model()
    except Exception:
        model_ok = False

    transformer_ok = False
    try:
        transformer = get_transformer_model()
        transformer_ok = transformer.is_ready
    except Exception:
        transformer_ok = False

    return HealthResponse(
        status="ok" if model_ok else "degraded",
        app=settings.app_name,
        model_loaded=model_ok,
        transformer_available=transformer_ok,
        database="configured",
    )



from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "docs" or full_path == "openapi.json":
            return None
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")

