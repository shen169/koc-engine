"""Product URL enricher — fetches product page and extracts metadata for auto-fill.

No new dependencies needed. Uses httpx (already in requirements) + stdlib re/json.
Graceful fallback: if page fetch fails (timeout, blocked, etc.), still returns
URL-derived data (platform, market, ASIN) so the user doesn't lose work.
"""

import re
import json
from urllib.parse import urlparse

import httpx

# ── Market detection from domain ────────────────────────────────────────────

AMAZON_MARKET_MAP: dict[str, str] = {
    "com": "US", "co.uk": "UK", "ca": "CA", "com.au": "AU",
    "co.jp": "JP", "de": "DE", "fr": "FR", "it": "IT", "es": "ES",
    "in": "IN", "com.br": "BR", "com.mx": "MX", "nl": "NL",
    "se": "SE", "pl": "PL", "sg": "SG", "ae": "AE", "sa": "SA",
}
SHOPEE_MARKET_MAP: dict[str, str] = {
    "sg": "SEA", "co.th": "SEA", "ph": "SEA", "co.id": "SEA",
    "vn": "SEA", "my": "SEA", "tw": "SEA",
}
EBAY_MARKET_MAP: dict[str, str] = {
    "com": "US", "co.uk": "UK", "ca": "CA", "com.au": "AU",
    "de": "DE", "fr": "FR", "it": "IT", "es": "ES",
}


def _parse_amazon_domain(hostname: str) -> tuple[str, str]:
    """Extract (sales_platform, target_market) from Amazon hostname."""
    for tld, market in AMAZON_MARKET_MAP.items():
        if hostname == f"amazon.{tld}" or hostname.endswith(f".amazon.{tld}"):
            return ("amazon", market)
    return ("amazon", "US")


def _detect_platform_and_market(url: str) -> tuple[str, str]:
    """From URL only (no fetch), detect platform and market."""
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower().replace("www.", "")

    if "amazon" in hostname:
        platform, market = _parse_amazon_domain(hostname)
    elif "shopify" in hostname or "myshopify" in hostname:
        platform, market = "shopify", "US"
    elif "walmart" in hostname:
        platform, market = "walmart", "US"
    elif "ebay" in hostname:
        platform = "ebay"
        market = "US"
        for tld, m in EBAY_MARKET_MAP.items():
            if hostname in (f"ebay.{tld}", f"www.ebay.{tld}"):
                market = m
                break
    elif "etsy" in hostname:
        platform, market = "etsy", "US"
    elif "shopee" in hostname:
        platform = "shopee"
        market = "SEA"
        for tld, m in SHOPEE_MARKET_MAP.items():
            if hostname == f"shopee.{tld}":
                market = m
                break
    elif "temu" in hostname:
        platform, market = "temu", "US"
    elif "aliexpress" in hostname:
        platform, market = "aliexpress", "CN"
    else:
        platform, market = "independent", "US"

    return (platform, market)


# ── ASIN extraction (Amazon-specific, no fetch needed) ─────────────────────

_ASIN_PATTERNS = [
    r"/dp/([A-Z0-9]{10})",
    r"/product/([A-Z0-9]{10})",
    r"/gp/product/([A-Z0-9]{10})",
    r"/exec/obidos/ASIN/([A-Z0-9]{10})",
    r"/exec/obidos/tg/detail/-/([A-Z0-9]{10})",
    r"/o/ASIN/([A-Z0-9]{10})",
    r"[?&]asin=([A-Z0-9]{10})",
]


def _extract_asin(url: str) -> str:
    """Extract Amazon ASIN from URL patterns."""
    for pattern in _ASIN_PATTERNS:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1)
    return ""


# ── HTML metadata extraction ─────────────────────────────────────────────────

def _strip_title_noise(title: str) -> str:
    """Remove common e-commerce prefixes/suffixes from page title."""
    title = re.sub(
        r"^(Amazon\.com\s*:\s*|Amazon\.co\.\w+\s*:\s*|Amazon\.\w+\s*:\s*|Amazon\s*:\s*)",
        "", title, flags=re.IGNORECASE,
    )
    title = re.sub(
        r"(\s*\|\s*Amazon\.\w+|\s*\|\s*Amazon|\s*-\s*Amazon\.com|\s*\|\s*Shopify|\s*\|\s*eBay|\s*\|\s*Etsy)$",
        "", title,
    )
    return title.strip()


def _extract_metadata_from_html(html: str) -> dict:
    """Parse HTML (stdlib regex only, no external deps) to extract product metadata."""
    result: dict = {}

    # <title>
    title_match = re.search(
        r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL,
    )
    if title_match:
        title = _strip_title_noise(title_match.group(1).strip())
        if len(title) > 3:
            result["name"] = title[:500]

    # <meta property="og:title">
    og_title = re.search(
        r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE,
    )
    if og_title and "name" not in result:
        result["name"] = og_title.group(1).strip()[:500]

    # <meta property="og:image">
    og_image = re.search(
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE,
    )
    if og_image:
        result["image_url"] = og_image.group(1).strip()

    # <meta name="description"> or og:description
    desc = re.search(
        r'<meta\s+(?:name|property)=["\'](?:description|og:description)["\']\s+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE,
    )
    if desc:
        result["description"] = desc.group(1).strip()[:1000]

    # JSON-LD Product schema
    jsonld_blocks = re.findall(
        r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.IGNORECASE | re.DOTALL,
    )
    for block in jsonld_blocks:
        try:
            data = json.loads(block)
            if isinstance(data, dict):
                # Some pages nest @graph; handle both
                if "@graph" in data:
                    items = data["@graph"] if isinstance(data["@graph"], list) else [data["@graph"]]
                else:
                    items = [data]

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    if item.get("@type") != "Product":
                        continue
                    if "name" in item and "name" not in result:
                        result["name"] = str(item["name"])[:500]
                    if "description" in item and "description" not in result:
                        result["description"] = str(item["description"])[:1000]
                    if "image" in item and "image_url" not in result:
                        img = item["image"]
                        if isinstance(img, list) and img:
                            img = img[0]
                        if isinstance(img, dict):
                            img = img.get("url", "")
                        if isinstance(img, str) and img.startswith("http"):
                            result["image_url"] = img
                    if "category" in item and "category" not in result:
                        cat = item["category"]
                        if isinstance(cat, dict):
                            cat = cat.get("name", "")
                        result["category_hint"] = str(cat)[:200]
        except (json.JSONDecodeError, KeyError, TypeError):
            continue

    return result


# ── Main entry point ─────────────────────────────────────────────────────────

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def enrich_product_url(url: str) -> dict:
    """Fetch a product URL and extract metadata for auto-filling the creation form.

    Returns:
        {
            product_url: str,
            sales_platform: str,
            target_market: str,
            product_id: str,       # ASIN for Amazon, empty otherwise
            name: str,
            description: str,
            image_url: str,
            category: str,
            errors: list[str],     # non-fatal warnings
        }
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    platform, market = _detect_platform_and_market(url)
    asin = _extract_asin(url) if platform == "amazon" else ""
    errors: list[str] = []
    metadata: dict = {}

    # Try HTTP fetch
    try:
        resp = httpx.get(
            url,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout=10.0,
            follow_redirects=True,
        )
        if resp.status_code == 200:
            html = resp.text
            # Truncate to avoid memory/performance issues on huge pages
            if len(html) > 500_000:
                html = html[:500_000]
            metadata = _extract_metadata_from_html(html)
        else:
            errors.append(f"Page returned HTTP {resp.status_code}")
    except httpx.TimeoutException:
        errors.append("Page fetch timed out after 10s — filled URL-derived fields only")
    except httpx.ConnectError:
        errors.append("Could not connect to the page — filled URL-derived fields only")
    except Exception as e:
        errors.append(f"Could not fetch page: {str(e)[:200]}")

    return {
        "product_url": url,
        "sales_platform": platform,
        "target_market": market,
        "product_id": asin or "",
        "name": metadata.get("name", ""),
        "description": metadata.get("description", ""),
        "image_url": metadata.get("image_url", ""),
        "category": metadata.get("category_hint", ""),
        "errors": errors,
    }
