from __future__ import annotations

import asyncio
import traceback
from collections.abc import Awaitable, Callable

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

from agents.crew import NEXUSCrew
from lib.logging_setup import logger
from models.schemas import AgentEvent, ResearchRequest, ResearchResult, ResearchStartResponse
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.persistent_store import PersistentRunStore, create_run_store
from services.settings import Settings

load_dotenv()

BroadcastFn = Callable[[AgentEvent], Awaitable[None]]


def resolve_mode(requested_mode: str, groq_service: GroqService) -> str:
    if requested_mode == "auto":
        return "live" if groq_service.is_available else "demo"
    if requested_mode == "live" and not groq_service.is_available:
        raise HTTPException(status_code=400, detail="Live mode requires GROQ_API_KEY.")
    return requested_mode


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    groq_service = GroqService(resolved_settings)
    demo_service = DemoResearchService(event_delay_ms=resolved_settings.demo_event_delay_ms)
    store = create_run_store(resolved_settings)
    app = FastAPI(title="NEXUS Research API", version="2.0-CrewAI")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve SPA fallback for GitHub Pages (only catch non-API paths)
    api_paths = {"/", "/research", "/latest", "/status", "/runs", "/ws"}
    try:
        from pathlib import Path
        dist_dir = Path(__file__).parent.parent / "frontend" / "dist"
        index_html = dist_dir / "index.html"
        if index_html.exists():
            @app.get("/{path_name:path}", include_in_schema=False)
            async def spa_fallback(path_name: str = "") -> HTMLResponse:
                # Don't intercept API endpoints
                if path_name.startswith("research") or path_name in ("latest", "status", "runs", "ws"):
                    raise HTTPException(status_code=404)
                full_path = (dist_dir / path_name)
                if full_path.exists() and full_path.is_file():
                    return HTMLResponse(content=full_path.read_text())
                return HTMLResponse(content=index_html.read_text())
    except Exception:
        pass

    app.state.settings = resolved_settings
    app.state.groq_service = groq_service
    app.state.demo_service = demo_service
    app.state.run_store = store
    app.state.connections: set[WebSocket] = set()
    app.state.tasks: dict[str, asyncio.Task] = {}

    async def broadcast(event: AgentEvent) -> None:
        payload = jsonable_encoder(event)
        stale: list[WebSocket] = []
        for connection in list(app.state.connections):
            try:
                await connection.send_json(payload)
            except Exception:
                stale.append(connection)
        for connection in stale:
            app.state.connections.discard(connection)

    app.state.broadcast = broadcast

    async def execute_pipeline(run_id: str) -> None:
        try:
            logger.info("[%s] Pipeline started (CrewAI architecture)", run_id)
            run = await app.state.run_store.mark_running(run_id)
            logger.info("[%s] Run marked as running, mode: %s", run_id, run.mode)

            await broadcast(AgentEvent(
                run_id=run_id, event="run_started", agent="NEXUS",
                status="running", message=f"NEXUS Crew started a {run.mode} research run.",
            ))

            crew = NEXUSCrew(
                run_id=run_id,
                question=run.question,
                depth=run.depth,
                mode=run.mode,
                settings=app.state.settings,
                groq_service=app.state.groq_service,
                demo_service=app.state.demo_service,
                broadcast=broadcast,
            )
            result_data = await crew.run()

            result = ResearchResult(
                question=run.question,
                depth=run.depth,
                mode=run.mode,
                queries=result_data["queries"],
                sources=result_data["sources"],
                findings=result_data["findings"],
                synthesis=result_data["synthesis"],
                critique=result_data["critique"],
                report=result_data["report"],
            )
            await app.state.run_store.set_result(run_id, result)
            logger.info("[%s] Result stored, research complete", run_id)

            await broadcast(AgentEvent(
                run_id=run_id, event="complete", agent="NEXUS",
                status="complete", message="NEXUS Crew completed the research run.",
            ))
        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}"
            logger.error("[%s] ERROR: %s", run_id, error_msg)
            await app.state.run_store.set_error(run_id, str(exc))
            await broadcast(AgentEvent(
                run_id=run_id, event="error", agent="NEXUS",
                status="error", message=str(exc),
            ))
        finally:
            app.state.tasks.pop(run_id, None)

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()
        app.state.connections.add(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            app.state.connections.discard(websocket)

    @app.get("/")
    async def root() -> dict:
        return {
            "status": "NEXUS CrewAI v2.0 online",
            "agents": ["SCOUT", "ANALYST", "CRITIC", "SCRIBE"],
            "architecture": "crew-ai-pattern",
            "groq_configured": app.state.groq_service.is_available,
        }

    @app.post("/research", response_model=ResearchStartResponse)
    async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks) -> ResearchStartResponse:
        mode = resolve_mode(request.mode, app.state.groq_service)
        run = await app.state.run_store.create_run(question=request.question, depth=request.depth, mode=mode)
        background_tasks.add_task(execute_pipeline, run.run_id)
        return ResearchStartResponse(run_id=run.run_id, status=run.status)

    @app.get("/research/{run_id}")
    async def get_research(run_id: str) -> JSONResponse:
        run = await app.state.run_store.get_run(run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found.")
        return JSONResponse(jsonable_encoder(run))

    @app.get("/latest")
    async def get_latest() -> JSONResponse:
        run = await app.state.run_store.get_latest()
        if run is None:
            raise HTTPException(status_code=404, detail="No completed run found.")
        return JSONResponse(jsonable_encoder(run))

    @app.get("/status")
    async def get_status() -> JSONResponse:
        status = await app.state.run_store.get_status(groq_configured=app.state.groq_service.is_available)
        return JSONResponse(status)

    @app.get("/runs")
    async def list_runs(limit: int = 20) -> JSONResponse:
        runs = await app.state.run_store.list_runs(limit=limit)
        return JSONResponse(jsonable_encoder(runs))

    return app


app = create_app()
