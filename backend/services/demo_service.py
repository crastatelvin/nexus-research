from __future__ import annotations

import asyncio
import string

from models.schemas import (
    AnalystSynthesis,
    Critique,
    CritiqueConfidence,
    FindingItem,
    QueryPlan,
    ResearchReport,
    SourceExtraction,
    SourceFinding,
    SourceResult,
)


class DemoResearchService:
    def __init__(self, event_delay_ms: int = 150):
        self.event_delay_ms = event_delay_ms

    async def pause(self) -> None:
        if self.event_delay_ms > 0:
            await asyncio.sleep(self.event_delay_ms / 1000)

    def generate_query_plan(self, *, question: str, depth: str) -> QueryPlan:
        topic = self._topic(question)
        queries = [
            f"{topic} latest evidence",
            f"{topic} expert analysis",
            f"{topic} risks and counterarguments",
        ]
        if depth == "deep":
            queries.append(f"{topic} adoption metrics and strategic implications")
        return QueryPlan(queries=queries)

    def generate_sources(self, *, question: str, depth: str) -> list[SourceResult]:
        topic = self._topic(question).title()
        templates = [
            ("Signal Brief", "A concise market and research scan for the topic."),
            ("Operating Model Review", "A practical view of adoption blockers and implementation patterns."),
            ("Evidence Roundup", "A synthesis of current claims, examples, and reported outcomes."),
            ("Critical Counterpoint", "A skeptical read on overstatements, missing evidence, and risk."),
        ]
        if depth == "deep":
            templates.append(("Leadership Playbook", "A deeper look at governance, sequencing, and decision criteria."))
        sources = []
        for index, (label, snippet) in enumerate(templates, start=1):
            slug = f"{topic.lower().replace(' ', '-')}-{index}"
            sources.append(
                SourceResult(
                    title=f"{topic} {label}",
                    url=f"https://example.com/nexus/{slug}",
                    snippet=snippet,
                )
            )
        return sources

    def generate_source_extraction(
        self,
        *,
        question: str,
        source: SourceResult,
        content: str,
    ) -> SourceExtraction:
        topic = self._topic(question)
        evidence = content[:120] or source.snippet or source.title
        statements = [
            f"{topic.title()} is moving from experimentation toward workflow integration in cross-functional teams.",
            f"Successful adoption depends on measurable outcomes, source quality, and clear reviewer accountability.",
            f"The strongest implementations pair fast synthesis with explicit critique and evidence review.",
        ]
        if "Critical" in source.title:
            statements[2] = (
                f"Several claims around {topic} are overstated when source quality, recency, or sample size are weak."
            )
        return SourceExtraction(
            findings=[
                FindingItem(statement=statement, evidence=evidence)
                for statement in statements
            ]
        )

    def generate_synthesis(self, *, question: str, findings: list[SourceFinding]) -> AnalystSynthesis:
        topic = self._topic(question)
        return AnalystSynthesis(
            key_themes=[
                f"{topic.title()} is being positioned as an acceleration layer for existing research workflows.",
                "Teams value faster source triage but still rely on human review for judgment calls.",
                "Structured critique improves trust compared with single-pass answer generation.",
                "Governance and source visibility remain core adoption requirements.",
            ],
            consensus_points=[
                "Speed gains are most visible in initial search, comparison, and draft synthesis.",
                "Quality improves when outputs stay grounded in explicit source artifacts.",
                "Human reviewers still own final recommendations in higher-stakes settings.",
            ],
            conflicting_points=[
                "Some sources describe broad productivity gains, while skeptical sources argue the evidence is still early.",
                "There is disagreement on how much domain expertise can be safely delegated to AI agents.",
            ],
            knowledge_gaps=[
                "Few sources provide long-run ROI baselines or controlled comparisons.",
                "Public reporting rarely includes failure rates or maintenance costs.",
            ],
        )

    def generate_critique(
        self,
        *,
        question: str,
        findings: list[SourceFinding],
        synthesis: AnalystSynthesis,
    ) -> Critique:
        topic = self._topic(question)
        return Critique(
            logical_flaws=[
                f"Several claims about {topic} assume that faster synthesis automatically yields better decisions.",
                "The evidence base leans more on directional examples than on controlled studies.",
            ],
            missing_perspectives=[
                "Change-management costs and reviewer training are not covered in depth.",
                "Sector-specific regulatory constraints are only lightly represented.",
            ],
            bias_risks=[
                "Many sources favor early adopters and may underrepresent failed rollouts.",
                "Vendor-adjacent framing can inflate claims of immediate strategic impact.",
            ],
            overstatements=[
                "Claims of end-to-end autonomy are stronger than the evidence presented.",
                "Near-term ROI certainty is not well supported by the cited material.",
            ],
            reliability_concerns=[
                "Source recency is mixed, which weakens precision for rapidly changing markets.",
                "Public examples do not always reveal methodology or sample size.",
            ],
            confidence=CritiqueConfidence(
                rating="MEDIUM",
                justification="The research direction is consistent, but the evidence is stronger on workflow acceleration than on durable business outcomes.",
            ),
        )

    def generate_report(
        self,
        *,
        question: str,
        findings: list[SourceFinding],
        synthesis: AnalystSynthesis,
        critique: Critique,
    ) -> ResearchReport:
        topic = self._topic(question)
        return ResearchReport(
            executive_summary=(
                f"NEXUS demo mode indicates that {topic} is most valuable as a force multiplier for research workflows, "
                "especially during source discovery, comparison, and first-draft synthesis. The strongest pattern across the demo evidence "
                "is that speed gains are real, but trust depends on citation visibility, critique, and human review."
            ),
            background=(
                f"The question matters because teams evaluating {topic} are balancing productivity gains against quality control, governance, "
                "and reputational risk. Research tooling that feels fast but opaque tends to stall once it reaches decision-heavy workflows."
            ),
            key_findings=[
                "Teams gain the most value when AI shortens the first pass of research rather than replacing expert judgment outright.",
                "Search, extraction, and critique together produce a more reliable output than a single generative answer.",
                "Adoption rises when outputs preserve source context and make disagreements explicit.",
                "Leadership teams look for measurable workflow gains before expanding rollout scope.",
                f"The largest unknown around {topic} is long-term ROI once review and governance costs are included.",
            ],
            analysis=(
                "The synthesized evidence points to a stable pattern: organizations want research acceleration, but only if the workflow stays inspectable. "
                "That makes the critique layer strategically important because it highlights where the evidence base is thin or overly confident.\n\n"
                "The findings also suggest that implementation success is operational rather than purely technical. Teams need source standards, reviewer roles, "
                "and a clear definition of when AI suggestions are drafts versus decisions.\n\n"
                f"Taken together, the material suggests that {topic} should be framed as a structured co-pilot for evidence work, not an unsupervised replacement for analysts."
            ),
            critical_perspectives=(
                "The underlying evidence is directionally consistent but not fully mature. Public examples emphasize positive use cases, while the critique shows that "
                "costs, governance effort, and failed implementations are still underreported."
            ),
            conclusion=(
                f"The strongest answer to '{question}' is that {topic} is reshaping research workflows by accelerating evidence gathering and synthesis, "
                "but the durable advantage comes from combining speed with visible critique and human review. Confidence is medium because long-run outcome data remains limited."
            ),
            recommendations=[
                "Pilot the workflow on bounded research questions with clear acceptance criteria.",
                "Require source links, extracted evidence, and critique notes in every generated report.",
                "Track time saved and rework volume before scaling to broader organizational use.",
                "Treat autonomous claims cautiously until evidence quality and governance are stronger.",
            ],
        )

    def _topic(self, question: str) -> str:
        words = [
            word.strip(string.punctuation).lower()
            for word in question.split()
            if len(word.strip(string.punctuation)) > 2
        ]
        if not words:
            return "the topic"
        return " ".join(words[:6])

