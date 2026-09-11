from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


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
    search_results_standard: int = 3
    search_results_deep: int = 5
    search_timeout_seconds: float = 12.0
    scrape_concurrency: int = 2
    scrape_timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls) -> "Settings":
        def get(env_var: str, default: str) -> str:
            return os.getenv(env_var, default).strip()

        origins_raw = get("CORS_ORIGINS", "*")
        origins = ["*"] if origins_raw == "*" else [o.strip() for o in origins_raw.split(",") if o.strip()]

        def model(key: str, fallback: str) -> str:
            val = get(key, get(fallback.upper(), fallback))
            return val or fallback

        return cls(
            groq_api_key=get("GROQ_API_KEY", ""),
            groq_model=get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            groq_model_scout=model("GROQ_MODEL_SCOUT", "llama-3.1-8b-instant"),
            groq_model_analyst=model("GROQ_MODEL_ANALYST", "llama-3.3-70b-versatile"),
            groq_model_critic=model("GROQ_MODEL_CRITIC", "llama-3.3-70b-versatile"),
            groq_model_scribe=model("GROQ_MODEL_SCRIBE", "llama-3.3-70b-versatile"),
            token_cap_scout=int(get("NEXUS_TOKEN_CAP_SCOUT", "320") or "320"),
            token_cap_analyst_extract=int(get("NEXUS_TOKEN_CAP_ANALYST_EXTRACT", "700") or "700"),
            token_cap_analyst_synthesis=int(get("NEXUS_TOKEN_CAP_ANALYST_SYNTHESIS", "600") or "600"),
            token_cap_critic=int(get("NEXUS_TOKEN_CAP_CRITIC", "600") or "600"),
            token_cap_scribe=int(get("NEXUS_TOKEN_CAP_SCRIBE", "1000") or "1000"),
            token_budget_per_run=int(get("NEXUS_TOKEN_BUDGET_PER_RUN", "12000") or "12000"),
            search_timeout_seconds=float(get("NEXUS_SEARCH_TIMEOUT_SECONDS", "12.0") or "12.0"),
            cors_origins=origins or ["*"],
            demo_event_delay_ms=int(get("NEXUS_DEMO_EVENT_DELAY_MS", "150") or "150"),
        )
