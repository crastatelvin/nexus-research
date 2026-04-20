from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from typing import Any

from pydantic import BaseModel, model_validator

from models.schemas import (
    AgentEvent,
    AnalystSynthesis,
    FindingItem,
    SourceExtraction,
    SourceFinding,
    SourceResult,
)
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.scraper_service import fetch_page_content
from services.settings import Settings

BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


class BatchSourceExtractions(BaseModel):
    extractions: list[SourceExtraction]

    @model_validator(mode="before")
    @classmethod
    def _coerce(cls, value: Any) -> Any:
        # Accept a bare list of extractions or a dict with common alternate keys.
        if isinstance(value, list):
            return {"extractions": value}
        if isinstance(value, dict):
            if "extractions" in value:
                return value
            for alt_key in ("sources", "results", "items", "data"):
                if alt_key in value and isinstance(value[alt_key], list):
                    return {"extractions": value[alt_key]}
            # Dict-of-objects (e.g. {"0": {...}, "1": {...}})
            numeric_items = [
                value[key]
                for key in sorted(value.keys(), key=lambda k: (len(k), k))
                if isinstance(value.get(key), dict)
            ]
            if numeric_items and all("findings" in item for item in numeric_items):
                return {"extractions": numeric_items}
        return value


def _finding_text(finding) -> str:
    """Extract plain text from a FindingItem or str."""
    if hasattr(finding, "statement"):
        return finding.statement
    return str(finding)


async def run_analyst(
    *,
    run_id: str,
    question: str,
    sources: list[SourceResult],
    depth: str,
    mode: str,
    settings: Settings,
    groq_service: GroqService,
    demo_service: DemoResearchService,
    broadcast: BroadcastFn,
) -> dict:
    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_started",
            agent="ANALYST",
            status="active",
            message=f"ANALYST is reviewing {len(sources)} candidate sources.",
        )
    )

    source_limit = 3 if depth == "standard" else 5  # Reduced from 4/6
    selected_sources = sources[:source_limit]

    if mode == "live":
        # --- OPTIMIZED: Fetch all pages concurrently, then ONE batch Groq call ---
        semaphore = asyncio.Semaphore(settings.scrape_concurrency)

        async def fetch_source(index: int, source: SourceResult) -> tuple[int, str]:
            async with semaphore:
                await broadcast(
                    AgentEvent(
                        run_id=run_id,
                        event="agent_progress",
                        agent="ANALYST",
                        status="reading",
                        message=f"ANALYST is reading source {index + 1}: {source.title}",
                    )
                )
                content = await fetch_page_content(
                    source.url,
                    max_chars=1800,  # Reduced from 4200 to cut input tokens
                    timeout_seconds=settings.scrape_timeout_seconds,
                )
                # Fall back to snippet if page content is too thin (block/timeout/paywall).
                if len(content) < 200:
                    fallback = source.snippet or source.title or ""
                    content = fallback if fallback else content
                return index, content

        # Fetch all pages concurrently
        fetch_results = await asyncio.gather(
            *(fetch_source(i, src) for i, src in enumerate(selected_sources))
        )
        contents = {idx: text for idx, text in fetch_results}

        await broadcast(
            AgentEvent(
                run_id=run_id,
                event="agent_progress",
                agent="ANALYST",
                status="analyzing",
                message=f"ANALYST is extracting findings from {len(selected_sources)} sources in one pass.",
            )
        )

        # Build a compact, token-efficient batch prompt
        sources_block = "\n\n".join(
            f"[Source {i + 1}] {src.title}\nURL: {src.url}\nText: {contents.get(i, src.snippet)[:1500]}"
            for i, src in enumerate(selected_sources)
        )

        batch_prompt = (
            f"Research question: {question}\n\n"
            f"Analyze each source below and extract concise, factual findings relevant to the question.\n"
            f"Return exactly this JSON shape with {len(selected_sources)} items (one per source, in order):\n"
            '{"extractions": [\n'
            '  {"findings": [{"statement": "...", "evidence": "..."}, {"statement": "...", "evidence": "..."}]},\n'
            "  ...\n"
            "]}\n\n"
            f"{sources_block}"
        )

        batch_result = await groq_service.generate_structured(
            prompt=batch_prompt,
            schema=BatchSourceExtractions,
            system_instruction=(
                "You are ANALYST. Extract only relevant, evidence-based findings. Be concise."
            ),
            model=settings.groq_model_analyst,
            max_tokens=settings.token_cap_analyst_extract,
            temperature=0.2,
            run_id=run_id,
            agent="ANALYST",
        )

        # Map batch extractions back to SourceFindings
        findings: list[SourceFinding] = []
        for i, source in enumerate(selected_sources):
            if i < len(batch_result.extractions):
                extraction = batch_result.extractions[i]
            else:
                extraction = SourceExtraction(
                    findings=[
                        FindingItem(
                            statement="No findings extracted.",
                            evidence=source.snippet or source.title,
                        )
                    ]
                )
            findings.append(
                SourceFinding(
                    source=source,
                    findings=extraction.findings,
                    source_excerpt=contents.get(i, source.snippet)[:350],
                )
            )

    else:
        # Demo mode — generate findings via demo service
        findings = []
        for index, source in enumerate(selected_sources):
            content = source.snippet
            extraction = demo_service.generate_source_extraction(
                question=question,
                source=source,
                content=content,
            )
            findings.append(
                SourceFinding(
                    source=source,
                    findings=extraction.findings,
                    source_excerpt=content[:350],
                )
            )

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_progress",
            agent="ANALYST",
            status="synthesizing",
            message="ANALYST is comparing the extracted findings across sources.",
        )
    )

    if mode == "live":
        # Compact synthesis prompt — send only finding text, not full objects
        findings_summary = "\n".join(
            f"Source {i + 1} ({f.source.title}): {'; '.join(_finding_text(fi) for fi in f.findings[:3])}"
            for i, f in enumerate(findings)
        )
        synthesis = await groq_service.generate_structured(
            prompt=(
                f"Research question: {question}\n\n"
                f"Source findings summary:\n{findings_summary}\n\n"
                "Return major themes, consensus points, conflicts, and knowledge gaps."
            ),
            schema=AnalystSynthesis,
            system_instruction=(
                "You are ANALYST. Produce a neutral, evidence-first cross-source synthesis. Be concise."
            ),
            model=settings.groq_model_analyst,
            max_tokens=settings.token_cap_analyst_synthesis,
            temperature=0.2,
            run_id=run_id,
            agent="ANALYST",
        )
    else:
        synthesis = demo_service.generate_synthesis(question=question, findings=findings)

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_completed",
            agent="ANALYST",
            status="complete",
            message=f"ANALYST synthesized {len(findings)} source reviews.",
            data={"findings": findings, "synthesis": synthesis},
        )
    )
    return {"findings": findings, "synthesis": synthesis}
