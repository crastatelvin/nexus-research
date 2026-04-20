from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(slots=True)
class Settings:
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_model_scout: str = "llama-3.1-8b-instant"
    groq_model_analyst: str = "llama-3.3-70b-versatile"
    groq_model_critic: str = "llama-3.3-70b-versatile"
    groq_model_scribe: str = "llama-3.3-70b-versatile"
    token_cap_scout: int = 320
    token_cap_analyst_extract: int = 700
    token_cap_analyst_synthesis: int = 600
    token_cap_critic: int = 600
    token_cap_scribe: int = 1000
    token_budget_per_run: int = 12000
    cors_origins: list[str] = field(default_factory=lambda: ["*"])
    demo_event_delay_ms: int = 150
    search_results_standard: int = 3   # Reduced to save tokens
    search_results_deep: int = 5        # Reduced to save tokens
    search_timeout_seconds: float = 12.0
    scrape_concurrency: int = 2
    scrape_timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls) -> "Settings":
        origins_raw = os.getenv("CORS_ORIGINS", "*").strip()
        if origins_raw == "*":
            origins = ["*"]
        else:
            origins = [origin.strip() for origin in origins_raw.split(",") if origin.strip()]

        return cls(
            groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
            groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile",
            groq_model_scout=(
                os.getenv("GROQ_MODEL_SCOUT", os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")).strip()
                or "llama-3.1-8b-instant"
            ),
            groq_model_analyst=(
                os.getenv("GROQ_MODEL_ANALYST", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")).strip()
                or "llama-3.3-70b-versatile"
            ),
            groq_model_critic=(
                os.getenv("GROQ_MODEL_CRITIC", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")).strip()
                or "llama-3.3-70b-versatile"
            ),
            groq_model_scribe=(
                os.getenv("GROQ_MODEL_SCRIBE", os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")).strip()
                or "llama-3.3-70b-versatile"
            ),
            token_cap_scout=int(os.getenv("NEXUS_TOKEN_CAP_SCOUT", "320") or "320"),
            token_cap_analyst_extract=int(
                os.getenv("NEXUS_TOKEN_CAP_ANALYST_EXTRACT", "700") or "700"
            ),
            token_cap_analyst_synthesis=int(
                os.getenv("NEXUS_TOKEN_CAP_ANALYST_SYNTHESIS", "600") or "600"
            ),
            token_cap_critic=int(os.getenv("NEXUS_TOKEN_CAP_CRITIC", "600") or "600"),
            token_cap_scribe=int(os.getenv("NEXUS_TOKEN_CAP_SCRIBE", "1000") or "1000"),
            token_budget_per_run=int(os.getenv("NEXUS_TOKEN_BUDGET_PER_RUN", "12000") or "12000"),
            search_timeout_seconds=float(
                os.getenv("NEXUS_SEARCH_TIMEOUT_SECONDS", "12.0") or "12.0"
            ),
            cors_origins=origins or ["*"],
            demo_event_delay_ms=int(os.getenv("NEXUS_DEMO_EVENT_DELAY_MS", "150") or "150"),
        )
