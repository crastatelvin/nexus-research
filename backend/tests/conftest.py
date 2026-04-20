from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import create_app
from services.settings import Settings


@pytest.fixture()
def client() -> TestClient:
    app = create_app(
        Settings(
            groq_api_key="",
            demo_event_delay_ms=0,
            cors_origins=["*"],
        )
    )
    return TestClient(app)


def wait_for_terminal_state(client: TestClient, run_id: str, limit: int = 250) -> dict:
    for _ in range(limit):
        response = client.get(f"/research/{run_id}")
        payload = response.json()
        if payload["status"] in {"complete", "error"}:
            return payload
        time.sleep(0.02)
    raise AssertionError("Run never reached a terminal state.")
