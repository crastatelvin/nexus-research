from __future__ import annotations

from conftest import wait_for_terminal_state


def test_start_research_and_complete_demo_run(client):
    response = client.post(
        "/research",
        json={"question": "How is AI changing enterprise research workflows?", "mode": "demo"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued"
    run = wait_for_terminal_state(client, payload["run_id"])
    assert run["status"] == "complete"
    assert run["result"]["mode"] == "demo"
    assert len(run["result"]["queries"]) >= 2
    assert len(run["result"]["sources"]) >= 4


def test_live_mode_requires_key(client):
    response = client.post(
        "/research",
        json={"question": "What is new in fusion energy?", "mode": "live"},
    )
    assert response.status_code == 400
    assert "GROQ_API_KEY" in response.json()["detail"]


def test_get_latest_and_status_after_run(client):
    create_response = client.post(
        "/research",
        json={"question": "What is changing in climate reporting?", "mode": "demo", "depth": "deep"},
    )
    run = wait_for_terminal_state(client, create_response.json()["run_id"])
    latest_response = client.get("/latest")
    status_response = client.get("/status")

    assert latest_response.status_code == 200
    assert latest_response.json()["run_id"] == run["run_id"]
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["completed_runs"] >= 1
    assert status_payload["groq_configured"] is False

