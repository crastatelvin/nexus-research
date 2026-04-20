from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from models.schemas import ResearchResult, RunEnvelope


def utc_now() -> datetime:
    return datetime.now(tz=UTC)


class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, RunEnvelope] = {}
        self._latest_run_id: str | None = None
        self._lock = asyncio.Lock()

    async def create_run(self, *, question: str, depth: str, mode: str) -> RunEnvelope:
        now = utc_now()
        run = RunEnvelope(
            run_id=str(uuid4()),
            question=question,
            depth=depth,
            mode=mode,
            status="queued",
            created_at=now,
            updated_at=now,
        )
        async with self._lock:
            self._runs[run.run_id] = run
        return run.model_copy(deep=True)

    async def mark_running(self, run_id: str) -> RunEnvelope:
        async with self._lock:
            run = self._runs[run_id]
            now = utc_now()
            updated = run.model_copy(
                update={
                    "status": "running",
                    "started_at": now,
                    "updated_at": now,
                    "error": None,
                }
            )
            self._runs[run_id] = updated
            return updated.model_copy(deep=True)

    async def set_result(self, run_id: str, result: ResearchResult) -> RunEnvelope:
        async with self._lock:
            run = self._runs[run_id]
            now = utc_now()
            updated = run.model_copy(
                update={
                    "status": "complete",
                    "result": result,
                    "completed_at": now,
                    "updated_at": now,
                    "error": None,
                }
            )
            self._runs[run_id] = updated
            self._latest_run_id = run_id
            return updated.model_copy(deep=True)

    async def set_error(self, run_id: str, error: str) -> RunEnvelope:
        async with self._lock:
            run = self._runs[run_id]
            now = utc_now()
            updated = run.model_copy(
                update={
                    "status": "error",
                    "error": error,
                    "completed_at": now,
                    "updated_at": now,
                }
            )
            self._runs[run_id] = updated
            return updated.model_copy(deep=True)

    async def get_run(self, run_id: str) -> RunEnvelope | None:
        async with self._lock:
            run = self._runs.get(run_id)
            return run.model_copy(deep=True) if run else None

    async def get_latest(self) -> RunEnvelope | None:
        async with self._lock:
            if self._latest_run_id is None:
                return None
            run = self._runs.get(self._latest_run_id)
            return run.model_copy(deep=True) if run else None

    async def get_status(self, *, groq_configured: bool) -> dict:
        async with self._lock:
            active_runs = sum(1 for run in self._runs.values() if run.status in {"queued", "running"})
            completed_runs = sum(1 for run in self._runs.values() if run.status == "complete")
            return {
                "active_runs": active_runs,
                "completed_runs": completed_runs,
                "latest_run_id": self._latest_run_id,
                "groq_configured": groq_configured,
            }

