from __future__ import annotations

import httpx
from bs4 import BeautifulSoup


async def fetch_page_content(url: str, max_chars: int = 4200, timeout_seconds: float = 10.0) -> str:
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
            response = await client.get(
                url,
                headers={"User-Agent": "NEXUS Research/1.0 (+https://localhost)"},
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            text = " ".join(text.split())
            return text[:max_chars]
    except Exception:
        return ""

