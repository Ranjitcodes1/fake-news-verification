from __future__ import annotations

import json
import re
from urllib.parse import urlparse

from app.core.config import get_settings
from app.core.security import validate_public_http_url

# Standard desktop browser headers to prevent anti-scraping 403 blocks on legitimate news outlets
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
}


def _extract_json_ld(soup) -> dict:
    """Extract schema.org NewsArticle or Article metadata from script tags."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            if not script.string:
                continue
            data = json.loads(script.string.strip())
            # Sometimes JSON-LD is an array or has @graph
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                items = data.get("@graph", [data])

            for item in items:
                if not isinstance(item, dict):
                    continue
                type_name = str(item.get("@type", "")).lower()
                if any(t in type_name for t in ("article", "newsarticle", "report")):
                    headline = item.get("headline") or item.get("name")
                    article_body = item.get("articleBody")
                    date_published = item.get("datePublished") or item.get("dateCreated")
                    author = item.get("author")
                    author_name = ""
                    if isinstance(author, dict):
                        author_name = author.get("name", "")
                    elif isinstance(author, list) and author:
                        author_name = author[0].get("name", "") if isinstance(author[0], dict) else str(author[0])
                    elif isinstance(author, str):
                        author_name = author

                    publisher = item.get("publisher")
                    publisher_name = ""
                    if isinstance(publisher, dict):
                        publisher_name = publisher.get("name", "")
                    elif isinstance(publisher, str):
                        publisher_name = publisher

                    return {
                        "headline": headline,
                        "content": article_body,
                        "date_published": date_published,
                        "author": author_name,
                        "publisher": publisher_name,
                    }
        except Exception:
            continue
    return {}


def fetch_article_from_url(url: str) -> dict:
    """
    Safely fetches and extracts structured article text and metadata from a public news/blog link.
    Protects against SSRF and strips boilerplate (ads, scripts, cookie banners).
    """
    import httpx
    from bs4 import BeautifulSoup

    safe_url = validate_public_http_url(url)
    settings = get_settings()

    try:
        with httpx.Client(
            follow_redirects=True,
            timeout=httpx.Timeout(settings.request_timeout_seconds, connect=12.0),
            headers=BROWSER_HEADERS,
        ) as client:
            response = client.get(safe_url)
    except httpx.TimeoutException as exc:
        raise ValueError(
            "The news server timed out while connecting. The website may be slow or offline."
        ) from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (401, 403):
            raise ValueError(
                "This news site requires a subscription or is blocking automated access (403 Forbidden). "
                "Please copy the article text directly and use the 'Direct Text Paste' tab."
            ) from exc
        raise ValueError(
            f"The news site returned an error (HTTP {exc.response.status_code})."
        ) from exc
    except Exception as exc:
        raise ValueError(f"Unable to establish connection to link: {exc}") from exc

    content_type = response.headers.get("content-type", "").lower()
    if "html" not in content_type and "text" not in content_type:
        raise ValueError(
            "This link does not point to a standard web article (content-type is not HTML)."
        )

    soup = BeautifulSoup(response.text, "html.parser")

    # 1. Parse JSON-LD if present
    json_ld_data = _extract_json_ld(soup)

    # 2. Extract Title / Headline
    og_title = (
        soup.find("meta", property="og:title")
        or soup.find("meta", attrs={"name": "twitter:title"})
        or soup.find("meta", attrs={"name": "title"})
    )
    title = ""
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif json_ld_data.get("headline"):
        title = str(json_ld_data["headline"]).strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text(" ", strip=True)
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Clean redundant site suffix from title (e.g. "News Title | BBC News" -> "News Title")
    if " - " in title:
        title = title.rsplit(" - ", 1)[0].strip()
    elif " | " in title:
        title = title.rsplit(" | ", 1)[0].strip()

    # 3. Extract Publisher / Site Name
    og_site = soup.find("meta", property="og:site_name")
    publisher = ""
    if og_site and og_site.get("content"):
        publisher = og_site["content"].strip()
    elif json_ld_data.get("publisher"):
        publisher = str(json_ld_data["publisher"]).strip()
    else:
        domain = (urlparse(str(response.url)).hostname or "").removeprefix("www.")
        publisher = domain.split(".")[0].capitalize() if domain else "Unknown Publisher"

    # 4. Extract Publication Date
    og_date = (
        soup.find("meta", property="article:published_time")
        or soup.find("meta", attrs={"name": "pubdate"})
        or soup.find("meta", attrs={"name": "publish-date"})
    )
    date_published = ""
    if og_date and og_date.get("content"):
        date_published = og_date["content"].strip()
    elif json_ld_data.get("date_published"):
        date_published = str(json_ld_data["date_published"]).strip()

    # 5. Extract Hero Image
    og_image = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
    image_url = og_image.get("content", "").strip() if og_image else ""

    # 6. Extract Author
    og_author = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", property="article:author")
    author = og_author.get("content", "").strip() if og_author else json_ld_data.get("author", "")

    # 7. Extract Main Article Body
    # If JSON-LD provided a rich articleBody of decent length, prioritize it
    json_ld_body = json_ld_data.get("content") or ""
    if len(json_ld_body) >= 200:
        body = json_ld_body
    else:
        # Strip all boilerplate, interactive, and auxiliary noise elements
        for noise in soup.find_all(
            [
                "script",
                "style",
                "nav",
                "aside",
                "footer",
                "header",
                "form",
                "noscript",
                "iframe",
                "svg",
                "button",
                "menu",
            ]
        ):
            noise.decompose()

        # Remove elements with typical noise classes or IDs
        noise_pattern = re.compile(
            r"(comment|sidebar|newsletter|social-share|cookie|banner|ad-|advertisement|popup|widget)",
            re.IGNORECASE,
        )
        for noise in soup.find_all(attrs={"class": noise_pattern}):
            noise.decompose()
        for noise in soup.find_all(attrs={"id": noise_pattern}):
            noise.decompose()

        # Target primary article container if available
        article_elem = (
            soup.find("article")
            or soup.find("main")
            or soup.find(attrs={"itemprop": "articleBody"})
            or soup.find(class_=re.compile(r"(article-body|story-content|entry-content|post-content)", re.IGNORECASE))
            or soup
        )

        paragraphs = [p.get_text(" ", strip=True) for p in article_elem.find_all("p")]
        # Keep paragraphs that contain substantive sentences (len >= 35 characters)
        substantive = [p for p in paragraphs if len(p) >= 35 and not p.lower().startswith("copyright")]
        body = "\n\n".join(substantive)

    if len(body) < 80:
        raise ValueError(
            "Could not extract sufficient article text from this page. "
            "The site might require JavaScript rendering or is paywalled. "
            "Please copy the article text and use the 'Direct Text Paste' tab."
        )

    return {
        "url": str(response.url),
        "headline": title[:500] if title else "Untitled Article",
        "content": body[: settings.max_article_chars],
        "publisher": publisher[:100],
        "published_date": date_published[:50],
        "image_url": image_url[:1000] if image_url.startswith("http") else "",
        "author": author[:100] if author else "",
    }

