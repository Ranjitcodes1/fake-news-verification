from __future__ import annotations

import re
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.sources import classify_domain

# Local mock knowledge base so evidence retrieval works offline or in tests without network.
# Local mock knowledge base including multilingual (Odia, Hindi, Spanish, English) records so evidence retrieval works offline without network.
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
    # --- Odia (ଓଡ଼ିଆ) Verified Knowledge Base Records ---
    {
        "keywords": ("ୟୁପିଆଇ", "ରାତି ୧୦", "ବନ୍ଦ", "ନିଷିଦ୍ଧ", "ବ୍ୟାଙ୍କ"),
        "source_name": "ଭାରତୀୟ ରିଜର୍ଭ ବ୍ୟାଙ୍କ (RBI Fact Check)",
        "url": "https://www.rbi.org.in/odia/payments-faq",
        "title": "ଡିଜିଟାଲ୍ ପେମେଣ୍ଟ ବ୍ୟବସ୍ଥା ୨୪ ଘଣ୍ଟା ଚାଲୁ ରହିବ, ରାତି ୧୦ଟା ପରେ ବନ୍ଦ ହେବା ଦାବି ମିଛ",
        "snippet": "ୟୁପିଆଇ ଏବଂ ଡିଜିଟାଲ୍ ନେଣଦେଣ ନିରନ୍ତର ଚାଲୁ ରହିଛି। ରାତି ୧୦ଟା ପରେ ୟୁପିଆଇ ବନ୍ଦ ହେବା ସମ୍ପର୍କିତ ସୋସିଆଲ ମିଡିଆ ଦାବି ସମ୍ପୂର୍ଣ୍ଣ ଭ୍ରମାତ୍ମକ ଏବଂ ଗୁଜବ।",
        "publication_date": "2025-02-01",
        "stance": "contradicts",
        "claim_hint": "odia_upi",
    },
    {
        "keywords": ("କର୍କଟ", "ଚେର", "୨୪ ଘଣ୍ଟା", "ଆରୋଗ୍ୟ", "ଔଷଧ"),
        "source_name": "ଓଡ଼ିଶା ସ୍ୱାସ୍ଥ୍ୟ ବିଭାଗ ତଥ୍ୟ ଯାଞ୍ଚ (Odisha Health)",
        "url": "https://health.odisha.gov.in/factcheck/cancer-cure",
        "title": "ଜଙ୍ଗଲୀ ଚେର ଦ୍ୱାରା ୨୪ ଘଣ୍ଟାରେ କର୍କଟ ଭଲ ହେବା ଦାବି ମିଥ୍ୟା ଓ ଭ୍ରାନ୍ତ",
        "snippet": "କୌଣସି ପ୍ରାକୃତିକ ଚେରମୂଳି କର୍କଟ ରୋଗକୁ ଗୋଟିଏ ରାତିରେ ସମ୍ପୂର୍ଣ୍ଣ ଭଲ କରିପାରିବ ନାହିଁ। ଏହିପରି ଦାବିକୁ ବିଶ୍ୱ ସ୍ୱାସ୍ଥ୍ୟ ସଂଗଠନ ଏବଂ ଡାକ୍ତରୀ ଗବେଷକମାନେ ଖଣ୍ଡନ କରିଛନ୍ତି।",
        "publication_date": "2025-01-25",
        "stance": "contradicts",
        "claim_hint": "odia_cancer",
    },
    {
        "keywords": ("ବାତ୍ୟା", "ପାଣିପାଗ", "ରେଡ୍ ଆଲର୍ଟ", "ପବନ"),
        "source_name": "ଭାରତୀୟ ପାଣିପାଗ ବିଭାଗ (IMD Bhubaneswar)",
        "url": "https://mausam.imd.gov.in/bhubaneswar",
        "title": "ପାଣିପାଗ ବିଭାଗ ପକ୍ଷରୁ ଉପକୂଳ ଜିଲ୍ଲାଗୁଡ଼ିକ ପାଇଁ ସତର୍କ ସୂଚନା ଜାରି",
        "snippet": "ଉତ୍ତର ବଙ୍ଗୋପସାଗରରେ ସୃଷ୍ଟ ଲଘୁଚାପ ଯୋଗୁଁ ରାଜ୍ୟର ବିଭିନ୍ନ ସ୍ଥାନରେ ପ୍ରବଳ ବର୍ଷା ସମ୍ଭାବନା ରହିଛି ବୋଲି ପାଣିପାଗ ବିଜ୍ଞାନ କେନ୍ଦ୍ର ପକ୍ଷରୁ ସ୍ପଷ୍ଟ କରାଯାଇଛି।",
        "publication_date": "2025-02-15",
        "stance": "supports",
        "claim_hint": "odia_weather",
    },
    # --- Hindi (हिन्दी) Verified Knowledge Base Records ---
    {
        "keywords": ("यूपीआई", "10 बजे", "प्रतिबंधित", "बंद"),
        "source_name": "पीआईबी फैक्ट चेक (PIB Fact Check Hindi)",
        "url": "https://factcheck.pib.gov.in/hindi/upi-alert",
        "title": "रात 10 बजे के बाद यूपीआई बंद होने का दावा फर्जी और भ्रामक है",
        "snippet": "सोशल मीडिया पर वायरल हो रहा यह दावा पूरी तरह फर्जी है कि रात 10 बजे के बाद यूपीआई काम नहीं करेगा। डिजिटल भुगतान 24/7 चालू रहता है।",
        "publication_date": "2025-01-10",
        "stance": "contradicts",
        "claim_hint": "hindi_upi",
    },
    {
        "keywords": ("कैंसर", "जादुई जड़", "इलाज", "24 घंटे"),
        "source_name": "भारतीय चिकित्सा अनुसंधान परिषद (ICMR)",
        "url": "https://icmr.gov.in/factcheck-cancer-remedy",
        "title": "किसी भी प्राचीन जड़ से कैंसर ठीक होने का कोई वैज्ञानिक प्रमाण नहीं",
        "snippet": "वैज्ञानिक शोध और क्लिनिकल परीक्षणों में ऐसी किसी जादुई जड़ी-बूटी का प्रमाण नहीं मिला है। यह दावा भ्रामक है।",
        "publication_date": "2025-01-18",
        "stance": "contradicts",
        "claim_hint": "hindi_health",
    },
    # --- Spanish (Español) Verified Knowledge Base Records ---
    {
        "keywords": ("cáncer", "cura milagrosa", "raíz", "24 horas"),
        "source_name": "Maldita Ciencia Fact Check",
        "url": "https://maldita.es/malditaciencia/cancer-raiz-bulo",
        "title": "Desmentido: Ninguna raíz milagrosa cura el cáncer terminal en 24 horas",
        "snippet": "La comunidad médica y la Sociedad Española de Oncología Médica confirman que no existe ninguna raíz mágica que destruya tumores de la noche a la mañana. Es un bulo peligroso.",
        "publication_date": "2025-01-12",
        "stance": "contradicts",
        "claim_hint": "spanish_health",
    },
]

STRONG_CONTRADICTION_TERMS = re.compile(
    r"\b(false|hoax|debunked|fake|refuted|incorrect|untrue|misleading|baseless|fabricated|"
    r"pants on fire|no evidence|disproven|scam|myth|doctored|fraudulent|unfounded|"
    # Odia contradiction terms
    r"ନକଲି|ମିଛ|ଭ୍ରମାତ୍ମକ|ଗୁଜବ|ଖଣ୍ଡନ|କୌଣସି ପ୍ରମାଣ ନାହିଁ|ସମ୍ପୂର୍ଣ୍ଣ ମିଥ୍ୟା|ଅପପ୍ରଚାର|ଭ୍ରାନ୍ତ|"
    # Hindi contradiction terms
    r"फर्जी|झूठ|गलत|भ्रामक|खारिज|दावा झूठा|अफवाह|बेबुनियाद|कोई सबूत नहीं|नकली|"
    # Spanish contradiction terms
    r"falso|bulo|desmentido|engañoso|sin pruebas|incorrecto|fraudulento|mito|desmienten)\b",
    re.IGNORECASE | re.UNICODE,
)
STRONG_SUPPORT_TERMS = re.compile(
    r"\b(confirmed|verified|true|correct|accurate|substantiated|authentic|official statement|"
    r"announces|signed into law|passed unanimously|peer-reviewed|validated|corroborated|"
    # Odia support terms
    r"ସତ୍ୟ|ପ୍ରମାଣିତ|ନିଶ୍ଚିତ|ସରକାରୀ ବିବୃତ୍ତି|ଅନୁମୋଦିତ|ସଠିକ୍|ପ୍ରକାଶିତ|ସ୍ପଷ୍ଟ|"
    # Hindi support terms
    r"पुष्ट|सत्य|सच|प्रमाणित|आधिकारिक बयान|सही|स्वीकृत|वास्तविक|"
    # Spanish support terms
    r"confirmado|verificado|verdadero|correcto|oficial|declaración oficial|validado)\b",
    re.IGNORECASE | re.UNICODE,
)
HEDGING_TERMS = re.compile(
    r"\b(alleged|unconfirmed|reportedly|claims without evidence|disputed|rumors?|speculation|"
    # Odia hedging
    r"କଥିତ|ଅସମର୍ଥିତ|ଅସ୍ପଷ୍ଟ|ଅନିଶ୍ଚିତ|"
    # Hindi hedging
    r"कथित|अपुष्ट|अटकलें|दावा किया जा रहा है|"
    # Spanish hedging
    r"supuesto|no confirmado|según informes|en disputa)\b",
    re.IGNORECASE | re.UNICODE,
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

    def search(self, claim: str, limit: int = 3, language_code: str = "en") -> list[dict]:
        raise NotImplementedError


class GoogleFactCheckProvider(EvidenceProvider):
    """Google Fact Check Tools API provider for professional journalist ClaimReviews."""
    name = "google_fact_check"

    def search(self, claim: str, limit: int = 3, language_code: str = "en") -> list[dict]:
        settings = get_settings()
        if not settings.google_fact_check_api_key:
            raise RuntimeError("GOOGLE_FACT_CHECK_API_KEY missing")

        url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        params: dict[str, Any] = {
            "query": claim[:200],
            "pageSize": limit,
            "key": settings.google_fact_check_api_key,
        }
        if language_code and language_code != "en":
            params["languageCode"] = language_code

        response = httpx.get(
            url,
            params=params,
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

    def search(self, claim: str, limit: int = 3, language_code: str = "en") -> list[dict]:
        settings = get_settings()
        clean_query = re.sub(r"[^\w\s]", " ", claim, flags=re.UNICODE).strip()
        words = clean_query.split()[:8]
        if not words:
            return []
        query_str = " ".join(words)

        accept_lang = "en-US,en;q=0.9"
        if language_code == "or":
            accept_lang = "or-IN,or;q=0.9,en;q=0.8"
        elif language_code == "hi":
            accept_lang = "hi-IN,hi;q=0.9,en;q=0.8"
        elif language_code == "es":
            accept_lang = "es-ES,es;q=0.9,en;q=0.8"

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": accept_lang,
        }

        try:
            timeout_cfg = httpx.Timeout(connect=0.6, read=1.0, write=0.6, pool=0.6)
            resp = httpx.get(
                "https://html.duckduckgo.com/html/",
                params={"q": f"{query_str} news"},
                headers=headers,
                timeout=timeout_cfg,
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

    def search(self, claim: str, limit: int = 3, language_code: str = "en") -> list[dict]:
        settings = get_settings()
        if not settings.news_api_key:
            raise RuntimeError("NEWS_API_KEY missing")
        lang = language_code if language_code in {"ar", "de", "en", "es", "fr", "he", "it", "nl", "no", "pt", "ru", "sv", "ud", "zh"} else "en"
        response = httpx.get(
            "https://newsapi.org/v2/everything",
            params={"q": claim[:500], "pageSize": limit, "language": lang, "sortBy": "relevancy"},
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

    def search(self, claim: str, limit: int = 3, language_code: str = "en") -> list[dict]:
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


def retrieve_evidence(claim: str, limit: int = 3, language_code: str = "en") -> tuple[list[dict], str | None]:
    providers = get_providers()
    collected: list[dict] = []
    warning: str | None = None

    for provider in providers:
        try:
            hits = provider.search(claim, limit=limit, language_code=language_code)
            if hits and any(h.get("domain") or h.get("url") for h in hits):
                collected.extend(hits)
                if len(collected) >= limit:
                    break
        except Exception as exc:
            warning = f"Live search via {provider.name} was not available ({exc})."
            continue

    if not collected:
        collected = MockEvidenceProvider().search(claim, limit=limit, language_code=language_code)

    return collected[:limit], warning
