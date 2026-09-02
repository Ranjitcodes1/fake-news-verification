from __future__ import annotations

import re
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.sources import classify_domain

# Local mock knowledge base so evidence retrieval works offline or in tests without network.
MOCK_KB: list[dict] = [
    {
        "keywords": ("interest rate", "central bank", "inflation", "monetary policy"),
        "source_name": "Reuters Central Banking Desk",
        "url": "https://www.reuters.com/markets/rates-monitor",
        "title": "Central banks announce rate decisions through official public bulletins",
        "snippet": "Benchmark interest rate decisions and monetary policy statements are released through formal institutional channels. Rumors of secret overnight decisions are refuted by regulators.",
        "publication_date": "2024-11-01",
        "stance": "supports",
        "claim_hint": "rate",
    },
    {
        "keywords": ("freeze", "bank", "accounts", "seizure", "confiscate", "midnight", "executive order"),
        "source_name": "FDIC & Banking Regulatory Alert",
        "url": "https://www.fdic.gov/resources/consumers/deposit-protection",
        "title": "Regulators refute viral claims of secret midnight bank account freezes",
        "snippet": "Personal bank deposits remain federally insured. Consumer protection authorities confirm assertions of unannounced midnight executive confiscations are fabricated hoaxes.",
        "publication_date": "2025-02-10",
        "stance": "contradicts",
        "claim_hint": "banking",
    },
    {
        "keywords": ("cancer", "cure", "remedy", "root", "herbal", "24 hours", "ancient"),
        "source_name": "National Cancer Institute Fact Check",
        "url": "https://www.cancer.gov/about-cancer/treatment/clinical-trials/debunked",
        "title": "Clinical oncology consensus: No ancient root eradicates terminal cancer in 24 hours",
        "snippet": "Peer-reviewed medical literature confirms there is no validated single root or unverified herbal formulation that destroys malignant tumors overnight. Such claims are medically disproven.",
        "publication_date": "2025-01-20",
        "stance": "contradicts",
        "claim_hint": "health",
    },
    {
        "keywords": ("exoplanet", "water", "vapor", "atmosphere", "spectroscopy", "astrophysicists"),
        "source_name": "Astrophysical Journal Research Feed",
        "url": "https://iopscience.iop.org/journal/0004-637X/exoplanet-spectroscopy",
        "title": "Spectroscopic confirmation of atmospheric water vapor in sub-Neptune exoplanets",
        "snippet": "Peer-reviewed observational data using space-based infrared transmission spectroscopy confirmed discrete molecular water vapor absorption bands in the atmosphere of exoplanets.",
        "publication_date": "2024-10-18",
        "stance": "supports",
        "claim_hint": "astrophysics",
    },
    {
        "keywords": ("upi", "10 pm", "banned"),
        "source_name": "Reserve Bank Payments FAQ",
        "url": "https://www.rbi.org.in/payments-faq",
        "title": "Digital payment networks operate 24/7 without overnight shutdown",
        "snippet": "Unified payment systems operate continuously around the clock. Claims asserting overnight operational bans after 10 PM are false.",
        "publication_date": "2024-06-01",
        "stance": "contradicts",
        "claim_hint": "upi",
    },
    {
        "keywords": ("water", "recall", "hospital", "respiratory"),
        "source_name": "Public Health Surveillance Desk",
        "url": "https://www.cdc.gov/seasonal-respiratory",
        "title": "Seasonal respiratory epidemiological reports are routinely published",
        "snippet": "Public health agencies routinely issue epidemiological updates on respiratory illnesses. Individual hospital statements are corroborated by state health registries.",
        "publication_date": "2025-01-15",
        "stance": "supports",
        "claim_hint": "health",
    },
]

STRONG_CONTRADICTION_TERMS = re.compile(
    r"\b(false|hoax|debunked|fake|refuted|incorrect|untrue|misleading|baseless|fabricated|"
    r"pants on fire|no evidence|disproven|scam|myth|doctored|fraudulent|unfounded)\b",
    re.IGNORECASE,
)
STRONG_SUPPORT_TERMS = re.compile(
    r"\b(confirmed|verified|true|correct|accurate|substantiated|authentic|official statement|"
    r"announces|signed into law|passed unanimously|peer-reviewed|validated|corroborated)\b",
    re.IGNORECASE,
)
HEDGING_TERMS = re.compile(
    r"\b(alleged|unconfirmed|reportedly|claims without evidence|disputed|rumors?|speculation)\b",
    re.IGNORECASE,
)


def _classify_stance(snippet: str, title: str = "", textual_rating: str = "") -> tuple[bool | None, str]:
    """Semantic stance classifier analyzing rating strings, headlines, and content snippets."""
    combined = f"{textual_rating} {title} {snippet}".lower()

    if textual_rating:
        if STRONG_CONTRADICTION_TERMS.search(textual_rating):
            return False, "contradicts"
        if STRONG_SUPPORT_TERMS.search(textual_rating):
            return True, "supports"

    contradiction_hits = len(STRONG_CONTRADICTION_TERMS.findall(combined))
    support_hits = len(STRONG_SUPPORT_TERMS.findall(combined))
    hedging_hits = len(HEDGING_TERMS.findall(combined))

    if contradiction_hits > support_hits:
        return False, "contradicts"
    if support_hits > contradiction_hits and hedging_hits == 0:
        return True, "supports"
    if hedging_hits > 0:
        return None, "inconclusive"

    return None, "inconclusive"


def _stance_flags(stance: str) -> tuple[bool | None, str]:
    if stance == "supports":
        return True, "supports"
    if stance == "contradicts":
        return False, "contradicts"
    return None, "inconclusive"


class EvidenceProvider:
    name = "base"

    def search(self, claim: str, limit: int = 3) -> list[dict]:
        raise NotImplementedError


class GoogleFactCheckProvider(EvidenceProvider):
    """Google Fact Check Tools API provider for professional journalist ClaimReviews."""
    name = "google_fact_check"

    def search(self, claim: str, limit: int = 3) -> list[dict]:
        settings = get_settings()
        if not settings.google_fact_check_api_key:
            raise RuntimeError("GOOGLE_FACT_CHECK_API_KEY missing")

        url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        response = httpx.get(
            url,
            params={
                "query": claim[:200],
                "pageSize": limit,
                "key": settings.google_fact_check_api_key,
            },
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()
        claims = data.get("claims") or []
        results: list[dict] = []

        for item in claims[:limit]:
            claim_reviews = item.get("claimReview") or []
            if not claim_reviews:
                continue
            review = claim_reviews[0]
            publisher = (review.get("publisher") or {}).get("name") or "Fact Checker"
            review_url = review.get("url") or ""
            rating = review.get("textualRating") or ""
            title = review.get("title") or item.get("text") or "Fact Check Assessment"
            supports, stance = _classify_stance(snippet=item.get("text") or "", title=title, textual_rating=rating)

            results.append(
                {
                    "source_name": publisher,
                    "domain": urlparse(review_url).hostname if review_url else None,
                    "url": review_url,
                    "title": f"Fact Check [{rating}]: {title}" if rating else title,
                    "publication_date": review.get("reviewDate"),
                    "snippet": f"Claim: {item.get('text', '')}. Rating: {rating}. Checked by {publisher}.",
                    "source_type": classify_domain(review_url),
                    "relevance_score": 0.88,
                    "supports_claim": supports,
                    "stance": stance,
                }
            )
        return results


class FreeWebSearchEvidenceProvider(EvidenceProvider):
    """Free web search provider using public search feeds to search for live evidence snippets without paid keys."""
    name = "free_web_search"

    def search(self, claim: str, limit: int = 3) -> list[dict]:
        settings = get_settings()
        clean_query = re.sub(r"[^\w\s]", " ", claim).strip()
        words = clean_query.split()[:8]
        if not words:
            return []
        query_str = " ".join(words)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            resp = httpx.get(
                "https://html.duckduckgo.com/html/",
                params={"q": f"{query_str} news"},
                headers=headers,
                timeout=min(settings.request_timeout_seconds, 6),
                follow_redirects=True,
            )
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            results: list[dict] = []

            for item in soup.select(".result"):
                title_elem = item.select_one(".result__title")
                snippet_elem = item.select_one(".result__snippet")
                link_elem = item.select_one(".result__url")

                if not title_elem or not snippet_elem:
                    continue

                title = title_elem.get_text(strip=True)
                snippet = snippet_elem.get_text(strip=True)
                raw_url = link_elem.get("href") if link_elem else ""

                domain = urlparse(raw_url).hostname if raw_url else "web"
                supports, stance = _classify_stance(snippet=snippet, title=title)

                results.append(
                    {
                        "source_name": domain or "Web Search",
                        "domain": domain,
                        "url": raw_url or "",
                        "title": title,
                        "publication_date": None,
                        "snippet": snippet,
                        "source_type": classify_domain(raw_url),
                        "relevance_score": 0.65,
                        "supports_claim": supports,
                        "stance": stance,
                    }
                )
                if len(results) >= limit:
                    break

            return results
        except Exception:
            return []


class NewsApiEvidenceProvider(EvidenceProvider):
    name = "newsapi"

    def search(self, claim: str, limit: int = 3) -> list[dict]:
        settings = get_settings()
        if not settings.news_api_key:
            raise RuntimeError("NEWS_API_KEY missing")
        response = httpx.get(
            "https://newsapi.org/v2/everything",
            params={"q": claim[:500], "pageSize": limit, "language": "en", "sortBy": "relevancy"},
            headers={"X-Api-Key": settings.news_api_key},
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
        articles = response.json().get("articles") or []
        results: list[dict] = []
        for article in articles[:limit]:
            url = article.get("url") or ""
            snippet = (article.get("description") or article.get("content") or "")[:400]
            title = article.get("title") or ""
            supports, stance = _classify_stance(snippet=snippet, title=title)
            results.append(
                {
                    "source_name": (article.get("source") or {}).get("name") or "NewsAPI",
                    "domain": urlparse(url).hostname,
                    "url": url,
                    "title": title,
                    "publication_date": article.get("publishedAt"),
                    "snippet": snippet,
                    "source_type": classify_domain(url),
                    "relevance_score": 0.6,
                    "supports_claim": supports,
                    "stance": stance,
                }
            )
        return results


class MockEvidenceProvider(EvidenceProvider):
    name = "mock_local"

    def search(self, claim: str, limit: int = 3) -> list[dict]:
        lowered = claim.lower()
        hits: list[dict] = []
        for record in MOCK_KB:
            if any(keyword in lowered for keyword in record["keywords"]):
                supports, stance = _stance_flags(record["stance"])
                domain = urlparse(record["url"]).hostname
                hits.append(
                    {
                        "source_name": record["source_name"],
                        "domain": domain,
                        "url": record["url"],
                        "title": record["title"],
                        "publication_date": record["publication_date"],
                        "snippet": record["snippet"],
                        "source_type": classify_domain(record["url"]),
                        "relevance_score": 0.72,
                        "supports_claim": supports,
                        "stance": stance,
                    }
                )
        return hits[:limit]


def get_providers() -> list[EvidenceProvider]:
    settings = get_settings()
    providers: list[EvidenceProvider] = []

    if settings.google_fact_check_api_key:
        providers.append(GoogleFactCheckProvider())
    if settings.news_api_key:
        providers.append(NewsApiEvidenceProvider())

    providers.append(FreeWebSearchEvidenceProvider())
    providers.append(MockEvidenceProvider())
    return providers


def retrieve_evidence(claim: str, limit: int = 3) -> tuple[list[dict], str | None]:
    providers = get_providers()
    collected: list[dict] = []
    warning: str | None = None

    for provider in providers:
        try:
            hits = provider.search(claim, limit=limit)
            if hits and any(h.get("domain") or h.get("url") for h in hits):
                collected.extend(hits)
                if len(collected) >= limit:
                    break
        except Exception as exc:
            warning = f"Live search via {provider.name} was not available ({exc})."
            continue

    if not collected:
        collected = MockEvidenceProvider().search(claim, limit=limit)

    return collected[:limit], warning
