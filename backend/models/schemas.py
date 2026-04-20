from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

DepthMode = Literal["standard", "deep"]
RunMode = Literal["auto", "live", "demo"]
ResolvedRunMode = Literal["live", "demo"]
RunStatus = Literal["queued", "running", "complete", "error"]
AgentName = Literal["NEXUS", "SCOUT", "ANALYST", "CRITIC", "SCRIBE"]
ConfidenceRating = Literal["HIGH", "MEDIUM", "LOW"]


class ResearchRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    depth: DepthMode = "standard"
    mode: RunMode = "auto"

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Question is required.")
        return cleaned


class ResearchStartResponse(BaseModel):
    run_id: str
    status: Literal["queued", "running"]


class SourceResult(BaseModel):
    title: str
    url: str
    snippet: str = ""


class QueryPlan(BaseModel):
    # SCOUT results are trimmed downstream, so allow a larger raw candidate set.
    queries: list[str] = Field(default_factory=list, min_length=1, max_length=12)


class FindingItem(BaseModel):
    statement: str
    evidence: str = ""

    @model_validator(mode="before")
    @classmethod
    def _coerce_string(cls, value: Any) -> Any:
        # Gracefully coerce plain strings (some models return ["..."] instead of objects).
        if isinstance(value, str):
            return {"statement": value, "evidence": ""}
        return value


class SourceExtraction(BaseModel):
    # Loose bounds: we want to accept whatever the LLM returns without triggering a
    # validation failure / retry. Downstream code takes the top N statements anyway.
    findings: list[FindingItem] = Field(default_factory=list, min_length=1, max_length=8)


class SourceFinding(BaseModel):
    source: SourceResult
    findings: list[FindingItem]
    source_excerpt: str = ""


class AnalystSynthesis(BaseModel):
    key_themes: list[str] = Field(default_factory=list)
    consensus_points: list[str] = Field(default_factory=list)
    conflicting_points: list[str] = Field(default_factory=list)
    knowledge_gaps: list[str] = Field(default_factory=list)


class CritiqueConfidence(BaseModel):
    rating: ConfidenceRating = "MEDIUM"
    justification: str = ""

    @field_validator("rating", mode="before")
    @classmethod
    def _normalize_rating(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip().upper()
            if normalized in {"HIGH", "MEDIUM", "LOW"}:
                return normalized
            return "MEDIUM"
        return value


class Critique(BaseModel):
    logical_flaws: list[str] = Field(default_factory=list)
    missing_perspectives: list[str] = Field(default_factory=list)
    bias_risks: list[str] = Field(default_factory=list)
    overstatements: list[str] = Field(default_factory=list)
    reliability_concerns: list[str] = Field(default_factory=list)
    confidence: CritiqueConfidence = Field(default_factory=CritiqueConfidence)

    @model_validator(mode="before")
    @classmethod
    def _coerce_confidence(cls, value: Any) -> Any:
        if isinstance(value, dict):
            raw = value.get("confidence")
            if isinstance(raw, str):
                # Some models emit just a rating string like "MEDIUM".
                value = dict(value)
                value["confidence"] = {"rating": raw, "justification": ""}
            elif raw is None:
                value = dict(value)
                value["confidence"] = {"rating": "MEDIUM", "justification": ""}
        return value


class ResearchReport(BaseModel):
    executive_summary: str = ""
    background: str = ""
    key_findings: list[str] = Field(default_factory=list)
    analysis: str = ""
    critical_perspectives: str = ""
    conclusion: str = ""
    recommendations: list[str] = Field(default_factory=list)


class ResearchResult(BaseModel):
    question: str
    depth: DepthMode
    mode: ResolvedRunMode
    queries: list[str]
    sources: list[SourceResult]
    findings: list[SourceFinding]
    synthesis: AnalystSynthesis
    critique: Critique
    report: ResearchReport


class RunEnvelope(BaseModel):
    run_id: str
    question: str
    depth: DepthMode
    mode: ResolvedRunMode
    status: RunStatus
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None
    result: ResearchResult | None = None


class AppStatus(BaseModel):
    active_runs: int
    completed_runs: int
    latest_run_id: str | None = None
    groq_configured: bool


class AgentEvent(BaseModel):
    run_id: str
    event: str
    agent: AgentName
    status: str
    message: str
    data: dict[str, Any] | None = None

