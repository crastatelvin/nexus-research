from __future__ import annotations

from conftest import wait_for_terminal_state
from models.schemas import SourceResult
from services.search_service import dedupe_sources


def test_websocket_emits_ordered_demo_events(client):
    events = []
    with client.websocket_connect("/ws") as websocket:
        create_response = client.post(
            "/research",
            json={"question": "How do teams evaluate AI copilots?", "mode": "demo"},
        )
        run_id = create_response.json()["run_id"]

        while True:
            payload = websocket.receive_json()
            if payload["run_id"] != run_id:
                continue
            events.append(payload)
            if payload["event"] in {"complete", "error"}:
                break

    event_names = [event["event"] for event in events]
    assert event_names[0] == "run_started"
    assert "agent_completed" in event_names
    assert event_names[-1] == "complete"
    assert [event["agent"] for event in events if event["event"] == "agent_completed"] == [
        "SCOUT",
        "ANALYST",
        "CRITIC",
        "SCRIBE",
    ]
    run = wait_for_terminal_state(client, run_id)
    assert run["status"] == "complete"


def test_dedupe_sources_normalizes_urls():
    sources = [
        SourceResult(title="One", url="https://example.com/path/", snippet="a"),
        SourceResult(title="Two", url="https://example.com/path#fragment", snippet="b"),
        SourceResult(title="Three", url="https://example.com/other", snippet="c"),
    ]
    unique_sources = dedupe_sources(sources)
    assert len(unique_sources) == 2
    assert unique_sources[0].url == "https://example.com/path"

