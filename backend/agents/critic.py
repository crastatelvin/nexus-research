from __future__ import annotations

from typing import Awaitable, Callable

from models.schemas import AgentEvent, AnalystSynthesis, Critique, SourceFinding
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.settings import Settings

BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


def _finding_text(finding) -> str:
    """Extract plain text from a FindingItem or str."""
    if hasattr(finding, "statement"):
        return finding.statement
    return str(finding)


async def run_critic(
    *,
    run_id: str,
    question: str,
    findings: list[SourceFinding],
    synthesis: AnalystSynthesis,
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
            agent="CRITIC",
            status="active",
            message="CRITIC is stress-testing the research narrative.",
        )
    )
    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_progress",
            agent="CRITIC",
            status="challenging",
            message="CRITIC is checking for bias, gaps, and overreach.",
        )
    )

    if mode == "live":
        # OPTIMIZED: compact text summaries — avoids serializing full Pydantic objects
        statements_per_source = 1 if len(findings) >= 4 else 2
        findings_summary = "\n".join(
            f"- {f.source.title}: {'; '.join(_finding_text(fi) for fi in f.findings[:statements_per_source])}"
            for f in findings
        )

        synthesis_summary = (
            "Themes: " + ", ".join(synthesis.key_themes[:3]) + "\n"
            + "Consensus: " + "; ".join(synthesis.consensus_points[:2]) + "\n"
            + "Conflicts: " + "; ".join(synthesis.conflicting_points[:2]) + "\n"
            + "Gaps: " + "; ".join(synthesis.knowledge_gaps[:2])
        )

        critique = await groq_service.generate_structured(
            prompt=(
                f"Research question: {question}\n\n"
                f"Key findings:\n{findings_summary}\n\n"
                f"Synthesis:\n{synthesis_summary}\n\n"
                "Return JSON with this exact shape:\n"
                '{\n'
                '  "logical_flaws": ["..."],\n'
                '  "missing_perspectives": ["..."],\n'
                '  "bias_risks": ["..."],\n'
                '  "overstatements": ["..."],\n'
                '  "reliability_concerns": ["..."],\n'
                '  "confidence": {"rating": "HIGH|MEDIUM|LOW", "justification": "..."}\n'
                "}"
            ),
            schema=Critique,
            system_instruction=(
                "You are CRITIC. Be rigorous, specific, and constructive. Keep your critique concise."
            ),
            model=settings.groq_model_critic,
            max_tokens=settings.token_cap_critic,
            temperature=0.15,
            run_id=run_id,
            agent="CRITIC",
        )
    else:
        critique = demo_service.generate_critique(
            question=question, findings=findings, synthesis=synthesis
        )

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_completed",
            agent="CRITIC",
            status="complete",
            message="CRITIC completed the adversarial review.",
            data={"critique": critique},
        )
    )
    return {"critique": critique}
