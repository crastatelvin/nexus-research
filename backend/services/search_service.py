from __future__ import annotations

import asyncio
from urllib.parse import parse_qs, unquote, urlsplit, urlunsplit

import httpx
from bs4 import BeautifulSoup

from models.schemas import SourceResult

try:
    # AsyncDDGS is a native-async client that avoids blocking the event loop
    # with its internal ThreadPoolExecutor (which the sync DDGS class uses).
    from duckduckgo_search import AsyncDDGS  # type: ignore[attr-defined]
except Exception:  # pragma: no cover - optional
    AsyncDDGS = None  # type: ignore[assignment]


def normalize_url(url: str) -> str:
    if not url:
        return ""
    split = urlsplit(url)
    path = split.path.rstrip("/") or "/"
    return urlunsplit((split.scheme, split.netloc.lower(), path, split.query, ""))


_AD_HOST_FRAGMENTS = ("duckduckgo.com/y.js", "bing.com/aclick", "doubleclick.net")


def _is_ad_or_tracker(url: str) -> bool:
    lowered = url.lower()
    return any(fragment in lowered for fragment in _AD_HOST_FRAGMENTS)


def dedupe_sources(sources: list[SourceResult]) -> list[SourceResult]:
    seen: set[str] = set()
    unique_sources: list[SourceResult] = []
    for source in sources:
        normalized = normalize_url(source.url)
        if not normalized or normalized in seen:
            continue
        if _is_ad_or_tracker(normalized):
            continue
        seen.add(normalized)
        unique_sources.append(source.model_copy(update={"url": normalized}))
    return unique_sources


def _unwrap_ddg_redirect(url: str) -> str:
    """DuckDuckGo HTML results wrap target URLs in /l/?uddg=<urlencoded>."""
    if not url:
        return ""
    if url.startswith("//"):
        url = "https:" + url
    split = urlsplit(url)
    if split.netloc.endswith("duckduckgo.com") and split.path.startswith("/l/"):
        qs = parse_qs(split.query)
        target = qs.get("uddg", [""])[0]
        if target:
            return unquote(target)
    return url


async def _search_async_ddgs(query: str, max_results: int) -> list[SourceResult]:
    if AsyncDDGS is None:
        return []
    client = AsyncDDGS()
    raw = await client.atext(query, max_results=max_results)  # type: ignore[attr-defined]
    results: list[SourceResult] = []
    for item in raw or []:
        results.append(
            SourceResult(
                title=item.get("title") or item.get("heading") or query,
                url=item.get("href") or item.get("url") or "",
                snippet=item.get("body") or item.get("snippet") or "",
            )
        )
        if len(results) >= max_results:
            break
    return results


async def _search_httpx_html(query: str, max_results: int) -> list[SourceResult]:
    """Fallback: scrape the DuckDuckGo HTML endpoint with httpx."""
    endpoint = "https://html.duckduckgo.com/html/"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml",
    }
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        response = await client.post(endpoint, data={"q": query}, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        results: list[SourceResult] = []
        for result in soup.select("div.result"):
            anchor = result.select_one("a.result__a") or result.select_one("a")
            snippet_el = result.select_one("a.result__snippet") or result.select_one(".result__snippet")
            if not anchor:
                continue
            title = anchor.get_text(" ", strip=True)
            href = _unwrap_ddg_redirect(anchor.get("href", ""))
            snippet = snippet_el.get_text(" ", strip=True) if snippet_el else ""
            if not href or not title:
                continue
            results.append(SourceResult(title=title, url=href, snippet=snippet))
            if len(results) >= max_results:
                break
        return results


async def search_web(
    query: str,
    max_results: int = 4,
    retries: int = 1,
    timeout_seconds: float = 12.0,
) -> list[SourceResult]:
    """Search the web, preferring AsyncDDGS and falling back to DDG HTML via httpx.

    A hard wall-clock timeout guarantees the coroutine returns, keeping the
    event loop responsive even when upstream search is rate-limited or slow.
    """
    async def _attempt() -> list[SourceResult]:
        last_error: Exception | None = None
        # 1) Try native async DDGS (avoids the sync executor that stalls Windows uvicorn).
        if AsyncDDGS is not None:
            try:
                data = await _search_async_ddgs(query, max_results)
                if data:
                    return data
            except Exception as exc:  # noqa: BLE001
                last_error = exc

        # 2) Fall back to the DuckDuckGo HTML endpoint via httpx (fully async).
        try:
            data = await _search_httpx_html(query, max_results)
            if data:
                return data
        except Exception as exc:  # noqa: BLE001
            last_error = exc

        if last_error is not None:
            # Surface as empty rather than crashing SCOUT; callers handle this.
            return []
        return []

    for attempt in range(retries + 1):
        try:
            return await asyncio.wait_for(_attempt(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            pass
        except Exception:  # pragma: no cover - defensive
            pass
        if attempt < retries:
            await asyncio.sleep(0.3 * (attempt + 1))
    return []
