from __future__ import annotations

from app.core.config import get_settings
from app.core.security import validate_public_http_url


def fetch_article_from_url(url: str) -> dict:
    import httpx
    from bs4 import BeautifulSoup

    safe_url = validate_public_http_url(url)
    settings = get_settings()
    headers = {"User-Agent": "VeritasVerifier/1.0 (educational; +http://localhost)"}
    with httpx.Client(follow_redirects=True, timeout=settings.request_timeout_seconds, headers=headers) as client:
        response = client.get(safe_url)
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if "html" not in content_type and "text" not in content_type:
            raise ValueError("URL did not return HTML content")
        soup = BeautifulSoup(response.text, "html.parser")
        title = (soup.title.string or "").strip() if soup.title else ""
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        body = "\n\n".join(p for p in paragraphs if len(p) > 40)
        if len(body) < 80:
            raise ValueError("Could not extract enough article text. Paste the article manually.")
        return {"url": str(response.url), "headline": title[:500], "content": body[: settings.max_article_chars]}
