from __future__ import annotations

import asyncio
from typing import Awaitable, Callable

from models.schemas import AgentEvent, QueryPlan, SourceResult
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.search_service import dedupe_sources, search_web
from services.settings import Settings

BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


async def run_scout(
    *,
    run_id: str,
    question: str,
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
            agent="SCOUT",
            status="active",
            message=f"SCOUT is planning search coverage for '{question}'.",
        )
    )

    if mode == "live":
        query_plan = await groq_service.generate_structured(
            prompt=(
                "Generate focused web research queries for the question below.\n"
                f"Question: {question}\n"
                f"Depth: {depth}\n"
                "Return short, high-signal search queries only."
            ),
            schema=QueryPlan,
            system_instruction=(
                "You are SCOUT, a search strategist. Favor authoritative, recent, and varied sources."
            ),
            model=settings.groq_model_scout,
            max_tokens=settings.token_cap_scout,
            temperature=0.2,
            run_id=run_id,
            agent="SCOUT",
        )
    else:
        query_plan = demo_service.generate_query_plan(question=question, depth=depth)

    query_limit = 2 if depth == "standard" else 3  # Reduced from 3/4 to save tokens
    queries = []
    for query in query_plan.queries:
        cleaned = query.strip()
        if cleaned and cleaned not in queries:
            queries.append(cleaned)
        if len(queries) == query_limit:
            break

    if not queries:
        raise RuntimeError("SCOUT could not generate search queries.")

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_progress",
            agent="SCOUT",
            status="searching",
            message=f"SCOUT is executing {len(queries)} search queries.",
            data={"queries": queries},
        )
    )

    if mode == "demo":
        unique_sources = demo_service.generate_sources(question=question, depth=depth)
    else:
        max_results_per_query = 2 if depth == "standard" else 3  # Reduced from 3/4 to save tokens

        async def search_query(query: str) -> list[SourceResult]:
            results = await search_web(
                query,
                max_results=max_results_per_query,
                timeout_seconds=settings.search_timeout_seconds,
            )
            await broadcast(
                AgentEvent(
                    run_id=run_id,
                    event="agent_progress",
                    agent="SCOUT",
                    status="searching",
                    message=f"SCOUT finished '{query}' with {len(results)} results.",
                )
            )
            return results

        query_results = await asyncio.gather(
            *(search_query(query) for query in queries), return_exceptions=True
        )
        all_sources: list[SourceResult] = []
        for result_set in query_results:
            if isinstance(result_set, Exception):
                await broadcast(
                    AgentEvent(
                        run_id=run_id,
                        event="agent_progress",
                        agent="SCOUT",
                        status="searching",
                        message=f"SCOUT search attempt failed ({type(result_set).__name__}); continuing.",
                    )
                )
                continue
            all_sources.extend(result_set)
        unique_sources = dedupe_sources(all_sources)

        source_limit = settings.search_results_standard if depth == "standard" else settings.search_results_deep
        unique_sources = unique_sources[:source_limit]

        if not unique_sources:
            await broadcast(
                AgentEvent(
                    run_id=run_id,
                    event="agent_progress",
                    agent="SCOUT",
                    status="searching",
                    message="SCOUT found no live results; falling back to demo sources.",
                )
            )
            unique_sources = demo_service.generate_sources(question=question, depth=depth)

    await broadcast(
        AgentEvent(
            run_id=run_id,
            event="agent_completed",
            agent="SCOUT",
            status="complete",
            message=f"SCOUT identified {len(unique_sources)} sources.",
            data={"queries": queries, "sources": unique_sources},
        )
    )
    return {"queries": queries, "sources": unique_sources}
