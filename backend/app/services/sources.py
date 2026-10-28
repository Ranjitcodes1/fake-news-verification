from __future__ import annotations

from urllib.parse import urlparse

OFFICIAL_SUFFIXES = (".gov", ".gov.in", ".nic.in", ".mil", ".edu", ".ac.in")

ESTABLISHED_NEWS = {
    # Global
    "reuters.com",
    "apnews.com",
    "bbc.com",
    "bbc.co.uk",
    "npr.org",
    "nytimes.com",
    "theguardian.com",
    "aljazeera.com",
    "cnn.com",
    "washingtonpost.com",
    "wsj.com",
    "bloomberg.com",
    "economist.com",
    "forbes.com",
    "time.com",
    # India National
    "thehindu.com",
    "indianexpress.com",
    "hindustantimes.com",
    "ndtv.com",
    "timesofindia.indiatimes.com",
    "indiatoday.in",
    "livemint.com",
    "theprint.in",
    "scroll.in",
    "thewire.in",
    "news18.com",
    "dnaindia.com",
    "firstpost.com",
    # Regional (Odisha & Eastern India)
    "sambad.in",
    "dharitri.com",
    "prameyanews.com",
    "samajaepaper.in",
    "otvkhabar.com",
    "odishatv.in",
    "kalingatv.com",
    "pragativadi.com",
}

RESEARCH_ORGS = {
    "who.int",
    "un.org",
    "nature.com",
    "science.org",
    "nih.gov",
    "cdc.gov",
    "icmr.gov.in",
    "isro.gov.in",
    "nasa.gov",
    "thelancet.com",
    "nejm.org",
}

SATIRE_OUTLETS = {
    "theonion.com",
    "babylonbee.com",
    "clickhole.com",
    "newsthump.com",
    "fakingnews.com",
    "thedailymash.co.uk",
}

SUSPICIOUS_HINTS = (
    "clickbait",
    "miracle",
    "100percent",
    "secrettruth",
    "breaking-alert",
    "shocking-news",
    "viral-truth",
    "hidden-cures",
    "leaked-docs",
)

POPULAR_BRANDS = ("bbc", "reuters", "cnn", "nytimes", "thehindu", "ndtv", "timesofindia")


def check_typosquatting(domain: str) -> str | None:
    """Detect if a domain is deceptively mimicking an established news brand."""
    d = domain.lower()
    for brand in POPULAR_BRANDS:
        if brand in d and d not in ESTABLISHED_NEWS:
            # If it contains brand like 'bbc' but is 'bbc-world-reports.info'
            if any(sep in d for sep in ("-", "_")) or d.endswith((".xyz", ".top", ".club", ".info", ".online", ".co.vu")):
                return f"Potential brand impersonation: '{domain}' contains '{brand}' but is not the authentic outlet domain."
    return None


def classify_domain(url_or_domain: str) -> str:
    host = url_or_domain.lower()
    if "://" in host:
        host = urlparse(host).hostname or host
    host = host.removeprefix("www.")

    if any(host.endswith(suffix) for suffix in OFFICIAL_SUFFIXES) or host.endswith(".gov"):
        return "OFFICIAL"
    if host in RESEARCH_ORGS or host.endswith(".edu") or host.endswith(".ac.in"):
        return "RESEARCH_ORGANIZATION"
    if host in SATIRE_OUTLETS:
        return "SATIRE_PARODY"
    if host in ESTABLISHED_NEWS:
        return "ESTABLISHED_NEWS"
    if any(hint in host for hint in SUSPICIOUS_HINTS):
        return "SUSPICIOUS"
    if host.endswith(".org"):
        return "KNOWN_ORGANIZATION"
    if not host:
        return "UNKNOWN"
    return "UNKNOWN"


def get_trust_score(category: str) -> float:
    scores = {
        "OFFICIAL": 0.95,
        "RESEARCH_ORGANIZATION": 0.95,
        "ESTABLISHED_NEWS": 0.88,
        "KNOWN_ORGANIZATION": 0.70,
        "UNKNOWN": 0.50,
        "SUSPICIOUS": 0.15,
        "SATIRE_PARODY": 0.10,
    }
    return scores.get(category, 0.50)


def analyze_url(url: str | None, headline: str = "") -> dict:
    if not url:
        return {
            "category": "UNKNOWN",
            "domain": None,
            "trust_score": 0.50,
            "notes": [
                "No article URL was provided. Source category is unknown.",
                "Category labels are coarse and do not score truthfulness.",
            ],
        }

    domain = (urlparse(url).hostname or "").removeprefix("www.")
    category = classify_domain(url)
    trust_score = get_trust_score(category)
    typosquat_warning = check_typosquatting(domain)

    notes = [
        f"Domain `{domain}` was categorized as {category}.",
        "This is an epistemic source classification, not an absolute guarantee of accuracy.",
    ]

    if category == "SATIRE_PARODY":
        notes.append("This domain is a recognized satire/humor publication. Content should not be treated as empirical news.")
    elif category == "ESTABLISHED_NEWS":
        notes.append("This domain has an established editorial track record and standard journalistic standards.")
    elif category == "OFFICIAL":
        notes.append("This is an official government or accredited academic institution domain.")

    if typosquat_warning:
        notes.append(f"WARNING: {typosquat_warning}")
        trust_score = min(trust_score, 0.25)

    sensational = any(
        token in headline.upper()
        for token in ("SHOCKING", "100% GUARANTEED", "THEY DON'T WANT YOU", "MIRACLE ROOT", "SECRET CURE")
    )
    if sensational:
        notes.append("The headline uses sensational clickbait phrasing independent of the domain category.")

    return {
        "category": category,
        "domain": domain or None,
        "trust_score": trust_score,
        "typosquat_warning": typosquat_warning,
        "notes": notes,
    }

