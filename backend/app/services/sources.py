from __future__ import annotations

from urllib.parse import urlparse

OFFICIAL_SUFFIXES = (".gov", ".gov.in", ".mil", ".edu")
ESTABLISHED_NEWS = {
    "reuters.com",
    "apnews.com",
    "bbc.com",
    "bbc.co.uk",
    "npr.org",
    "thehindu.com",
    "indianexpress.com",
    "nytimes.com",
    "theguardian.com",
    "aljazeera.com",
}
RESEARCH = {"who.int", "un.org", "nature.com", "science.org", "nih.gov", "cdc.gov"}
SUSPICIOUS_HINTS = ("clickbait", "miracle", "100percent", "secrettruth")


def classify_domain(url_or_domain: str) -> str:
    host = url_or_domain.lower()
    if "://" in host:
        host = urlparse(host).hostname or host
    host = host.removeprefix("www.")
    if any(host.endswith(suffix) for suffix in OFFICIAL_SUFFIXES) or host.endswith(".gov"):
        return "OFFICIAL"
    if host in RESEARCH or host.endswith(".edu"):
        return "RESEARCH_ORGANIZATION"
    if host in ESTABLISHED_NEWS:
        return "ESTABLISHED_NEWS"
    if any(hint in host for hint in SUSPICIOUS_HINTS):
        return "SUSPICIOUS"
    if host.endswith(".org"):
        return "KNOWN_ORGANIZATION"
    if not host:
        return "UNKNOWN"
    return "UNKNOWN"


def analyze_url(url: str | None, headline: str = "") -> dict:
    if not url:
        return {
            "category": "UNKNOWN",
            "domain": None,
            "notes": [
                "No article URL was provided. Source category is unknown.",
                "Category labels are coarse and do not score truthfulness.",
            ],
        }
    domain = (urlparse(url).hostname or "").removeprefix("www.")
    category = classify_domain(url)
    notes = [
        f"Domain `{domain}` was categorized as {category}.",
        "This is a coarse source type, not a truth score.",
        "Established outlets can still publish errors; unknown sites can still publish accurate reports.",
    ]
    sensational = any(token in headline.upper() for token in ("SHOCKING", "100% GUARANTEED", "THEY DON'T WANT YOU"))
    if sensational:
        notes.append("The headline uses sensational phrasing independent of the domain category.")
    return {"category": category, "domain": domain or None, "notes": notes}
