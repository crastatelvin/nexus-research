from __future__ import annotations

import asyncio
import traceback
from collections.abc import Awaitable, Callable

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agents.analyst import run_analyst
from agents.critic import run_critic
from agents.scout import run_scout
from agents.scribe import run_scribe
from models.schemas import AgentEvent, ResearchRequest, ResearchResult, ResearchStartResponse
from services.demo_service import DemoResearchService
from services.groq_service import GroqService
from services.run_store import RunStore
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
    store = RunStore()
    app = FastAPI(title="NEXUS Research API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    async def execute_pipeline(run_id: str) -> None:
        try:
            print(f"[{run_id}] Pipeline started")
            run = await app.state.run_store.mark_running(run_id)
            print(f"[{run_id}] Run marked as running, mode: {run.mode}")
            
            await broadcast(
                AgentEvent(
                    run_id=run_id,
                    event="run_started",
                    agent="NEXUS",
                    status="running",
                    message=f"NEXUS started a {run.mode} research run.",
                )
            )
            await app.state.demo_service.pause()

            print(f"[{run_id}] Running SCOUT...")
            scout_output = await run_scout(
                run_id=run_id,
                question=run.question,
                depth=run.depth,
                mode=run.mode,
                settings=app.state.settings,
                groq_service=app.state.groq_service,
                demo_service=app.state.demo_service,
                broadcast=broadcast,
            )
            print(f"[{run_id}] SCOUT completed, found {len(scout_output['sources'])} sources")
            await app.state.demo_service.pause()

            print(f"[{run_id}] Running ANALYST...")
            analyst_output = await run_analyst(
                run_id=run_id,
                question=run.question,
                sources=scout_output["sources"],
                depth=run.depth,
                mode=run.mode,
                settings=app.state.settings,
                groq_service=app.state.groq_service,
                demo_service=app.state.demo_service,
                broadcast=broadcast,
            )
            print(f"[{run_id}] ANALYST completed, found {len(analyst_output['findings'])} findings")
            await app.state.demo_service.pause()

            print(f"[{run_id}] Running CRITIC...")
            critic_output = await run_critic(
                run_id=run_id,
                question=run.question,
                findings=analyst_output["findings"],
                synthesis=analyst_output["synthesis"],
                mode=run.mode,
                settings=app.state.settings,
                groq_service=app.state.groq_service,
                demo_service=app.state.demo_service,
                broadcast=broadcast,
            )
            print(f"[{run_id}] CRITIC completed")
            await app.state.demo_service.pause()

            print(f"[{run_id}] Running SCRIBE...")
            scribe_output = await run_scribe(
                run_id=run_id,
                question=run.question,
                sources=scout_output["sources"],
                findings=analyst_output["findings"],
                synthesis=analyst_output["synthesis"],
                critique=critic_output["critique"],
                mode=run.mode,
                settings=app.state.settings,
                groq_service=app.state.groq_service,
                demo_service=app.state.demo_service,
                broadcast=broadcast,
            )
            print(f"[{run_id}] SCRIBE completed")

            result = ResearchResult(
                question=run.question,
                depth=run.depth,
                mode=run.mode,
                queries=scout_output["queries"],
                sources=scout_output["sources"],
                findings=analyst_output["findings"],
                synthesis=analyst_output["synthesis"],
                critique=critic_output["critique"],
                report=scribe_output["report"],
            )
            await app.state.run_store.set_result(run_id, result)
            print(f"[{run_id}] Result stored, research complete")
            
            await broadcast(
                AgentEvent(
                    run_id=run_id,
                    event="complete",
                    agent="NEXUS",
                    status="complete",
                    message="NEXUS completed the research run.",
                )
            )
        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {str(exc)}\n{traceback.format_exc()}"
            print(f"[{run_id}] ERROR: {error_msg}")
            await app.state.run_store.set_error(run_id, str(exc))
            await broadcast(
                AgentEvent(
                    run_id=run_id,
                    event="error",
                    agent="NEXUS",
                    status="error",
                    message=str(exc),
                )
            )
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
            "status": "NEXUS is online",
            "agents": ["SCOUT", "ANALYST", "CRITIC", "SCRIBE"],
            "groq_configured": app.state.groq_service.is_available,
        }

    @app.post("/research", response_model=ResearchStartResponse)
    async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks) -> ResearchStartResponse:
        mode = resolve_mode(request.mode, app.state.groq_service)
        run = await app.state.run_store.create_run(
            question=request.question,
            depth=request.depth,
            mode=mode,
        )
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
        status = await app.state.run_store.get_status(
            groq_configured=app.state.groq_service.is_available
        )
        return JSONResponse(status)

    return app


app = create_app()

