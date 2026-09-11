from __future__ import annotations

import json
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
    findings: list[FindingItem] = Field(default_factory=list, min_length=1, max_length=10)


class BatchSourceExtractions(BaseModel):
    extractions: list[SourceExtraction] = Field(default_factory=list)


class SourceFinding(BaseModel):
    source: SourceResult
    findings: list[FindingItem]
    source_excerpt: str = ""


class AnalystSynthesis(BaseModel):
    key_themes: list[str] = Field(default_factory=list)
    consensus_points: list[str] = Field(default_factory=list)
    conflicting_points: list[str] = Field(default_factory=list)
    knowledge_gaps: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def _coerce_fields(cls, value: Any) -> Any:
        if isinstance(value, dict):
            # LLM might use shorter names like "themes", "consensus", etc.
            mapping = {
                "themes": "key_themes",
                "theme_list": "key_themes",
                "consensus": "consensus_points",
                "conflicts": "conflicting_points",
                "gaps": "knowledge_gaps",
            }
            for old_name, new_name in mapping.items():
                if old_name in value and new_name not in value:
                    value = dict(value)
                    value[new_name] = value.pop(old_name)

            # Flatten list-of-objects to list-of-strings for all fields
            for field_name in ("key_themes", "consensus_points", "conflicting_points", "knowledge_gaps"):
                items = value.get(field_name, [])
                if items and isinstance(items, list):
                    flattened = []
                    for item in items:
                        if isinstance(item, dict):
                            # Extract meaningful string from dict
                            text = item.get("name") or item.get("theme") or item.get("point") or item.get("description", "")
                            if text:
                                flattened.append(str(text))
                            else:
                                flattened.append(json.dumps(item))
                        else:
                            flattened.append(str(item))
                    value = dict(value)
                    value[field_name] = flattened
            return value
        return value


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

    @model_validator(mode="before")
    @classmethod
    def _coerce_fields(cls, value: Any) -> Any:
        if isinstance(value, dict):
            # key_findings might be [{"finding": "..."}] instead of ["..."]
            kf = value.get("key_findings", [])
            if kf and isinstance(kf, list) and len(kf) > 0 and isinstance(kf[0], dict):
                value = dict(value)
                value["key_findings"] = [
                    item.get("finding", item) if isinstance(item, dict) else str(item)
                    for item in kf
                ]
            # critical_perspectives might be a nested dict
            cp = value.get("critical_perspectives")
            if isinstance(cp, dict):
                value = dict(value)
                value["critical_perspectives"] = json.dumps(cp)
            # Convert all string fields to str explicitly
            for field_name in ("executive_summary", "background", "analysis", "conclusion"):
                v = value.get(field_name)
                if v is not None and not isinstance(v, str):
                    value = dict(value)
                    value[field_name] = json.dumps(v) if isinstance(v, (list, dict)) else str(v)
            return value
        return value


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

