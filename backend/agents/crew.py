"""
Crew AI-style Agent Abstraction Layer for NEXUS Research

Replaces ad-hoc agent functions with structured Crew-like classes:
- Each agent has: role, goal, tools, execute()
- Shared context flows between agents
- Deterministic demo mode preserved
- WebSocket broadcast interface unchanged (frontend untouched)
"""
from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from models.schemas import (
    AgentEvent,
    AnalystSynthesis,
    BatchSourceExtractions,
    Critique,
    FindingItem,
    QueryPlan,
    ResearchReport,
    SourceExtraction,
    SourceFinding,
    SourceResult,
)
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.search_service import dedupe_sources, search_web
from services.scraper_service import fetch_page_content
from services.settings import Settings

logger = logging.getLogger("nexus.agents")


BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


@dataclass
class AgentContext:
    """Shared mutable state flowing through the crew pipeline."""
    run_id: str
    question: str
    depth: str
    mode: str
    queries: list[str] = field(default_factory=list)
    sources: list[SourceResult] = field(default_factory=list)
    findings: list[SourceFinding] = field(default_factory=list)
    synthesis: AnalystSynthesis | None = None
    critique: Critique | None = None
    report: ResearchReport | None = None


class CrewAgent(ABC):
    """Base class for all NEXUS research agents."""

    name: str = "agent"
    role: str = ""
    goal: str = ""

    def __init__(
        self,
        *,
        settings: Settings,
        groq_service: GroqService,
        demo_service: DemoResearchService,
        broadcast: BroadcastFn,
        context: AgentContext,
    ):
        self.settings = settings
        self.groq = groq_service
        self.demo = demo_service
        self.broadcast = broadcast
        self.ctx = context

    async def _start(self, message: str) -> None:
        await self.broadcast(AgentEvent(
            run_id=self.ctx.run_id,
            event="agent_started",
            agent=self.name,
            status="active",
            message=message,
        ))

    async def _progress(self, status: str, message: str, **extra) -> None:
        await self.broadcast(AgentEvent(
            run_id=self.ctx.run_id,
            event="agent_progress",
            agent=self.name,
            status=status,
            message=message,
            data=extra,
        ))

    async def _complete(self, message: str, **extra) -> None:
        await self.broadcast(AgentEvent(
            run_id=self.ctx.run_id,
            event="agent_completed",
            agent=self.name,
            status="complete",
            message=message,
            data=extra,
        ))

    @abstractmethod
    async def execute(self) -> dict[str, Any]: ...


class ScoutAgent(CrewAgent):
    """SCOUT: Web reconnaissance — finds and deduplicates sources."""

    name = "SCOUT"
    role = "Web Research Strategist"
    goal = "Generate targeted search queries and collect authoritative sources."

    async def execute(self) -> dict[str, Any]:
        await self._start(f"Planning search coverage for '{self.ctx.question}'...")

        # Generate queries
        if self.ctx.mode == "live":
            query_plan = await self.groq.generate_structured(
                prompt=(
                    f"Generate focused web research queries for: {self.ctx.question}\n"
                    f"Depth: {self.ctx.depth}\nReturn short, high-signal search queries only."
                ),
                schema=QueryPlan,
                system_instruction="You are SCOUT, a search strategist. Favor authoritative, recent sources.",
                model=self.settings.groq_model_scout,
                max_tokens=self.settings.token_cap_scout,
                temperature=0.2,
                run_id=self.ctx.run_id,
                agent=self.name,
            )
        else:
            query_plan = self.demo.generate_query_plan(question=self.ctx.question, depth=self.ctx.depth)

        # Deduplicate and limit queries
        seen = set()
        queries = []
        limit = 2 if self.ctx.depth == "standard" else 3
        for q in query_plan.queries:
            q = q.strip()
            if q and q not in seen:
                seen.add(q)
                queries.append(q)
                if len(queries) >= limit:
                    break

        if not queries:
            raise RuntimeError("SCOUT could not generate search queries.")

        self.ctx.queries = queries
        await self._progress("searching", f"Executing {len(queries)} queries...")

        # Fetch sources
        if self.ctx.mode == "demo":
            sources = self.demo.generate_sources(question=self.ctx.question, depth=self.ctx.depth)
        else:
            max_per_query = 2 if self.ctx.depth == "standard" else 3

            async def _fetch(q: str) -> list[SourceResult]:
                results = await search_web(q, max_results=max_per_query,
                                           timeout_seconds=self.settings.search_timeout_seconds)
                await self._progress("searching", f"Found {len(results)} results for '{q[:40]}...'")
                return results

            raw = await asyncio.gather(*[_fetch(q) for q in queries], return_exceptions=True)
            all_sources: list[SourceResult] = []
            for r in raw:
                if isinstance(r, Exception):
                    await self._progress("searching", f"Query failed ({type(r).__name__}); continuing.")
                else:
                    all_sources.extend(r)

            sources = dedupe_sources(all_sources)
            limit = self.settings.search_results_standard if self.ctx.depth == "standard" else self.settings.search_results_deep
            sources = sources[:limit]

            if not sources:
                await self._progress("searching", "No live results; falling back to demo sources.")
                sources = self.demo.generate_sources(question=self.ctx.question, depth=self.ctx.depth)

        self.ctx.sources = sources
        await self._complete(f"Identified {len(sources)} sources.", queries=queries, sources=sources)
        return {"queries": queries, "sources": sources}


class AnalystAgent(CrewAgent):
    """ANALYST: Extracts findings from sources and synthesizes themes."""

    name = "ANALYST"
    role = "Evidence Analyst"
    goal = "Extract evidence-based findings and synthesize cross-source insights."

    async def execute(self) -> dict[str, Any]:
        await self._start(f"Reviewing {len(self.ctx.sources)} candidate sources...")

        source_limit = 3 if self.ctx.depth == "standard" else 5
        selected = self.ctx.sources[:source_limit]

        if self.ctx.mode == "live":
            semaphore = asyncio.Semaphore(self.settings.scrape_concurrency)

            async def _scrape(idx: int, src: SourceResult) -> tuple[int, str]:
                async with semaphore:
                    await self._progress("reading", f"Reading source {idx+1}: {src.title[:50]}")
                    content = await fetch_page_content(src.url, max_chars=1800,
                                                       timeout_seconds=self.settings.scrape_timeout_seconds)
                    if len(content) < 200:
                        content = (src.snippet or src.title or "")[:1500]
                    return idx, content

            contents_map = dict(await asyncio.gather(*[_scrape(i, s) for i, s in enumerate(selected)]))

            # Batch extraction prompt
            sources_block = "\n\n".join(
                f"[Source {i+1}] {s.title}\nURL: {s.url}\nText: {contents_map.get(i, s.snippet)[:1500]}"
                for i, s in enumerate(selected)
            )
            batch_prompt = (
                f"Research question: {self.ctx.question}\n\n"
                f"Analyze each source and extract concise, factual findings.\n"
                f'Return JSON: {{"extractions": [{{"findings": [{{"statement":"...", "evidence":"..."}}]}}]}}\n\n{sources_block}'
            )

            batch = await self.groq.generate_structured(
                prompt=batch_prompt,
                schema=BatchSourceExtractions,
                system_instruction="You are ANALYST. Extract only relevant, evidence-based findings. Be concise.",
                model=self.settings.groq_model_analyst,
                max_tokens=self.settings.token_cap_analyst_extract,
                temperature=0.2,
                run_id=self.ctx.run_id,
                agent=self.name,
            )

            findings = []
            for i, src in enumerate(selected):
                ex = batch.extractions[i] if i < len(batch.extractions) else SourceExtraction(
                    findings=[FindingItem(statement="No findings extracted.", evidence=src.snippet or src.title)]
                )
                findings.append(SourceFinding(
                    source=src,
                    findings=ex.findings,
                    source_excerpt=contents_map.get(i, src.snippet)[:350],
                ))
        else:
            findings = []
            for src in selected:
                ext = self.demo.generate_source_extraction(question=self.ctx.question, source=src,
                                                           content=src.snippet)
                findings.append(SourceFinding(source=src, findings=ext.findings,
                                              source_excerpt=src.snippet[:350]))

        self.ctx.findings = findings
        await self._progress("synthesizing", "Comparing findings across sources...")

        # Synthesis
        if self.ctx.mode == "live":
            summary = "\n".join(
                f"Source {i+1} ({f.source.title}): {'; '.join(fi.statement for fi in f.findings[:3])}"
                for i, f in enumerate(findings)
            )
            self.ctx.synthesis = await self.groq.generate_structured(
                prompt=f"Research question: {self.ctx.question}\n\nFindings:\n{summary}\n\nThemes, consensus, conflicts, gaps.",
                schema=AnalystSynthesis,
                system_instruction="You are ANALYST. Produce neutral, evidence-first synthesis.",
                model=self.settings.groq_model_analyst,
                max_tokens=self.settings.token_cap_analyst_synthesis,
                temperature=0.2,
                run_id=self.ctx.run_id,
                agent=self.name,
            )
        else:
            self.ctx.synthesis = self.demo.generate_synthesis(question=self.ctx.question, findings=findings)

        await self._complete(f"Synthesized {len(findings)} source reviews.")
        return {"findings": findings, "synthesis": self.ctx.synthesis}


class CriticAgent(CrewAgent):
    """CRITIC: Adversarial review — challenges assumptions and bias."""

    name = "CRITIC"
    role = "Critical Reviewer"
    goal = "Challenge findings for logical flaws, bias, missing perspectives, and overreach."

    async def execute(self) -> dict[str, Any]:
        await self._start("Stress-testing the research narrative...")
        await self._progress("challenging", "Checking for bias, gaps, and overreach...")

        if self.ctx.mode == "live":
            per_src = 1 if len(self.ctx.findings) >= 4 else 2
            findings_text = "\n".join(
                f"- {f.source.title}: {'; '.join(fi.statement for fi in f.findings[:per_src])}"
                for f in self.ctx.findings
            )
            synth_text = (
                f"Themes: {', '.join(self.ctx.synthesis.key_themes[:3])}\n"
                f"Consensus: {'; '.join(self.ctx.synthesis.consensus_points[:2])}\n"
                f"Conflicts: {'; '.join(self.ctx.synthesis.conflicting_points[:2])}\n"
                f"Gaps: {'; '.join(self.ctx.synthesis.knowledge_gaps[:2])}"
            )
            self.ctx.critique = await self.groq.generate_structured(
                prompt=(
                    f"Question: {self.ctx.question}\n\nKey findings:\n{findings_text}\n\n"
                    f"Synthesis:\n{synth_text}\n\nReturn JSON with: logical_flaws, missing_perspectives, "
                    f"bias_risks, overstatements, reliability_concerns, confidence"
                ),
                schema=Critique,
                system_instruction="You are CRITIC. Be rigorous, specific, constructive.",
                model=self.settings.groq_model_critic,
                max_tokens=self.settings.token_cap_critic,
                temperature=0.15,
                run_id=self.ctx.run_id,
                agent=self.name,
            )
        else:
            self.ctx.critique = self.demo.generate_critique(
                question=self.ctx.question, findings=self.ctx.findings,
                synthesis=self.ctx.synthesis,
            )

        await self._complete("Adversarial review complete.")
        return {"critique": self.ctx.critique}


class ScribeAgent(CrewAgent):
    """SCRIBE: Final report synthesis — turns research into executive brief."""

    name = "SCRIBE"
    role = "Research Writer"
    goal = "Produce a polished, sourced executive research brief."

    async def execute(self) -> dict[str, Any]:
        await self._start("Shaping the final research report...")
        await self._progress("writing", "Drafting executive narrative and recommendations...")

        if self.ctx.mode == "live":
            per_src = 1 if len(self.ctx.findings) >= 4 else 2
            sources_list = "\n".join(f"{i+1}. {s.title} — {s.url}" for i, s in enumerate(self.ctx.sources[:5]))
            findings_text = "\n".join(
                f"- {f.source.title}: {'; '.join(fi.statement for fi in f.findings[:per_src])}"
                for f in self.ctx.findings
            )
            synth_text = (
                f"Themes: {', '.join(self.ctx.synthesis.key_themes[:4])}\n"
                f"Consensus: {'; '.join(self.ctx.synthesis.consensus_points[:3])}\n"
                f"Conflicts: {'; '.join(self.ctx.synthesis.conflicting_points[:2])}\n"
                f"Gaps: {'; '.join(self.ctx.synthesis.knowledge_gaps[:2])}"
            )
            crit_text = (
                f"Confidence: {self.ctx.critique.confidence.rating}\n"
                f"Flaws: {'; '.join(self.ctx.critique.logical_flaws[:2])}\n"
                f"Bias: {'; '.join(self.ctx.critique.bias_risks[:2])}\n"
                f"Missing: {'; '.join(self.ctx.critique.missing_perspectives[:2])}"
            )
            self.ctx.report = await self.groq.generate_structured(
                prompt=(
                    f"Question: {self.ctx.question}\n\nSources:\n{sources_list}\n\n"
                    f"Findings:\n{findings_text}\n\nSynthesis:\n{synth_text}\n\nCritique:\n{crit_text}\n\n"
                    f"Return JSON: executive_summary, background, key_findings, analysis, "
                    f"critical_perspectives, conclusion, recommendations"
                ),
                schema=ResearchReport,
                system_instruction="You are SCRIBE. Write crisply for executives. Ground claims in findings.",
                model=self.settings.groq_model_scribe,
                max_tokens=self.settings.token_cap_scribe,
                temperature=0.2,
                run_id=self.ctx.run_id,
                agent=self.name,
            )
        else:
            self.ctx.report = self.demo.generate_report(
                question=self.ctx.question, findings=self.ctx.findings,
                synthesis=self.ctx.synthesis, critique=self.ctx.critique,
            )

        await self._complete("Research brief complete.")
        return {"report": self.ctx.report}


class NEXUSCrew:
    """Orchestrates the agent pipeline with shared context."""

    def __init__(
        self,
        *,
        run_id: str,
        question: str,
        depth: str,
        mode: str,
        settings: Settings,
        groq_service: GroqService,
        demo_service: DemoResearchService,
        broadcast: BroadcastFn,
    ):
        self.ctx = AgentContext(
            run_id=run_id, question=question, depth=depth, mode=mode,
        )
        self.settings = settings
        self.groq = groq_service
        self.demo = demo_service
        self.broadcast = broadcast
        self.agents: list[CrewAgent] = []

    def _build_agents(self) -> None:
        self.agents = [
            ScoutAgent(settings=self.settings, groq_service=self.groq,
                       demo_service=self.demo, broadcast=self.broadcast, context=self.ctx),
            AnalystAgent(settings=self.settings, groq_service=self.groq,
                         demo_service=self.demo, broadcast=self.broadcast, context=self.ctx),
            CriticAgent(settings=self.settings, groq_service=self.groq,
                        demo_service=self.demo, broadcast=self.broadcast, context=self.ctx),
            ScribeAgent(settings=self.settings, groq_service=self.groq,
                        demo_service=self.demo, broadcast=self.broadcast, context=self.ctx),
        ]

    async def run(self) -> dict:
        self._build_agents()
        for agent in self.agents:
            logger.info("[%s] Running %s...", self.ctx.run_id, agent.name)
            await agent.execute()
        return {
            "queries": self.ctx.queries,
            "sources": self.ctx.sources,
            "findings": self.ctx.findings,
            "synthesis": self.ctx.synthesis,
            "critique": self.ctx.critique,
            "report": self.ctx.report,
        }
