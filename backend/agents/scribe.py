from __future__ import annotations

from typing import Awaitable, Callable

from models.schemas import (
    AgentEvent,
    AnalystSynthesis,
    Critique,
    ResearchReport,
    SourceFinding,
    SourceResult,
)
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.settings import Settings

BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


def _finding_text(finding) -> str:
    """Extract plain text from a FindingItem or str."""
    if hasattr(finding, "statement"):
        return finding.statement
    return str(finding)


async def run_scribe(
    *,
    run_id: str,
    question: str,
    sources: list[SourceResult],
    findings: list[SourceFinding],
    synthesis: AnalystSynthesis,
    critique: Critique,
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
            agent="SCRIBE",
            status="active",
            message="SCRIBE is shaping the final research report.",
        )
    )
    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_progress",
            agent="SCRIBE",
            status="writing",
            message="SCRIBE is drafting the executive narrative and recommendations.",
        )
    )

    if mode == "live":
        # OPTIMIZED: compact text summaries — avoids huge serialized object dumps

        statements_per_source = 1 if len(findings) >= 4 else 2

        # Sources: just title + URL, no snippets
        sources_list = "\n".join(
            f"{i + 1}. {s.title} — {s.url}"
            for i, s in enumerate(sources[:5])
        )

        # Findings: adaptive compression based on number of reviewed sources
        findings_summary = "\n".join(
            f"- {f.source.title}: {'; '.join(_finding_text(fi) for fi in f.findings[:statements_per_source])}"
            for f in findings
        )

        # Synthesis: key fields only
        synthesis_summary = (
            "Themes: " + ", ".join(synthesis.key_themes[:4]) + "\n"
            + "Consensus: " + "; ".join(synthesis.consensus_points[:3]) + "\n"
            + "Conflicts: " + "; ".join(synthesis.conflicting_points[:2]) + "\n"
            + "Gaps: " + "; ".join(synthesis.knowledge_gaps[:2])
        )

        # Critique: key fields only
        critique_summary = (
            "Confidence: " + critique.confidence.rating + "\n"
            + "Flaws: " + "; ".join(critique.logical_flaws[:2]) + "\n"
            + "Bias risks: " + "; ".join(critique.bias_risks[:2]) + "\n"
            + "Missing: " + "; ".join(critique.missing_perspectives[:2])
        )

        report = await groq_service.generate_structured(
            prompt=(
                f"Research question: {question}\n\n"
                f"Sources consulted:\n{sources_list}\n\n"
                f"Key findings:\n{findings_summary}\n\n"
                f"Synthesis:\n{synthesis_summary}\n\n"
                f"Critique:\n{critique_summary}\n\n"
                "Return JSON with this exact shape:\n"
                '{\n'
                '  "executive_summary": "...",\n'
                '  "background": "...",\n'
                '  "key_findings": ["..."],\n'
                '  "analysis": "...",\n'
                '  "critical_perspectives": "...",\n'
                '  "conclusion": "...",\n'
                '  "recommendations": ["..."]\n'
                "}"
            ),
            schema=ResearchReport,
            system_instruction=(
                "You are SCRIBE. Write crisply for an executive audience. "
                "Ground all claims in the provided findings. No hype."
            ),
            model=settings.groq_model_scribe,
            max_tokens=settings.token_cap_scribe,
            temperature=0.2,
            run_id=run_id,
            agent="SCRIBE",
        )
    else:
        report = demo_service.generate_report(
            question=question,
            findings=findings,
            synthesis=synthesis,
            critique=critique,
        )

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_completed",
            agent="SCRIBE",
            status="complete",
            message="SCRIBE finished the report.",
            data={"report": report},
        )
    )
    return {"report": report}
