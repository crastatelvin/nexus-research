"""SQLite-backed RunStore for NEXUS Research.

Replaces in-memory dict with persistent storage. Survives restarts,
enables run history and replay.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from models.schemas import ResearchResult, RunEnvelope
from services.settings import Settings


def _serialize(obj: Any) -> str:
    if isinstance(obj, (list, dict)):
        return json.dumps(obj, default=str)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


def _deserialize(data: str | None) -> Any:
    if data is None:
        return None
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return data


class PersistentRunStore:
    """SQLite backend for research runs."""

    def __init__(self, db_path: str | Path | None = None):
        self.db_path = Path(db_path or ".nexus_runs.sqlite")
        self._init_db()

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    run_id TEXT PRIMARY KEY,
                    question TEXT NOT NULL,
                    depth TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    error TEXT,
                    result_json TEXT,
                    tokens_used INTEGER DEFAULT 0
                )
            """)
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_status ON runs(status)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_created ON runs(created_at DESC)"
            )
            conn.commit()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    async def create_run(self, *, question: str, depth: str, mode: str) -> RunEnvelope:
        from uuid import uuid4
        now = datetime.now(tz=timezone.utc).isoformat()
        run_id = str(uuid4())
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO runs (run_id, question, depth, mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'queued', ?, ?)",
                (run_id, question, depth, mode, now, now),
            )
            conn.commit()
        return RunEnvelope(run_id=run_id, question=question, depth=depth, mode=mode,
                           status="queued", created_at=datetime.fromisoformat(now),
                           updated_at=datetime.fromisoformat(now))

    async def mark_running(self, run_id: str) -> RunEnvelope:
        now = datetime.now(tz=timezone.utc).isoformat()
        with self._conn() as conn:
            conn.execute(
                "UPDATE runs SET status='running', started_at=?, updated_at=? WHERE run_id=?",
                (now, now, run_id),
            )
            conn.commit()
        return await self.get_run(run_id)

    async def set_result(self, run_id: str, result: ResearchResult) -> RunEnvelope:
        now = datetime.now(tz=timezone.utc).isoformat()
        # Pydantic models use model_dump(), not asdict()
        result_dict = result.model_dump() if hasattr(result, 'model_dump') else result.__dict__
        result_json = json.dumps(result_dict, default=_serialize)
        with self._conn() as conn:
            conn.execute(
                "UPDATE runs SET status='complete', result_json=?, completed_at=?, updated_at=? WHERE run_id=?",
                (result_json, now, now, run_id),
            )
            conn.commit()
        return await self.get_run(run_id)

    async def set_error(self, run_id: str, error: str) -> RunEnvelope:
        now = datetime.now(tz=timezone.utc).isoformat()
        with self._conn() as conn:
            conn.execute(
                "UPDATE runs SET status='error', error=?, completed_at=?, updated_at=? WHERE run_id=?",
                (error, now, now, run_id),
            )
            conn.commit()
        return await self.get_run(run_id)

    async def get_run(self, run_id: str) -> RunEnvelope | None:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone()
        if not row:
            return None
        return self._row_to_envelope(row)

    async def get_latest(self) -> RunEnvelope | None:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM runs WHERE status='complete' ORDER BY completed_at DESC LIMIT 1"
            ).fetchone()
        return self._row_to_envelope(row) if row else None

    async def list_runs(self, limit: int = 20) -> list[RunEnvelope]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM runs ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._row_to_envelope(r) for r in rows]

    async def get_status(self, *, groq_configured: bool) -> dict:
        with self._conn() as conn:
            active = conn.execute("SELECT COUNT(*) FROM runs WHERE status IN ('queued','running')").fetchone()[0]
            completed = conn.execute("SELECT COUNT(*) FROM runs WHERE status='complete'").fetchone()[0]
            total = conn.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
        return {"active_runs": active, "completed_runs": completed, "total_runs": total,
                "groq_configured": groq_configured, "db_path": str(self.db_path)}

    def _row_to_envelope(self, row: sqlite3.Row) -> RunEnvelope:
        result = _deserialize(row["result_json"])
        if result and isinstance(result, dict):
            result = ResearchResult(**result)
        return RunEnvelope(
            run_id=row["run_id"], question=row["question"], depth=row["depth"],
            mode=row["mode"], status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
            completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None,
            error=row["error"], result=result,
        )


def create_run_store(settings: Settings | None = None) -> PersistentRunStore:
    db_path = (settings and getattr(settings, 'db_path', None)) or ".nexus_runs.sqlite"
    return PersistentRunStore(Path(db_path))
