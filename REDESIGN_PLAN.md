# NEXUS Research — Redesign Plan

## Phase 1: Crew AI Architecture (CrewAI-based agents)
- Replace custom agent.py with CrewAI framework
- SCOUT: WebResearchAgent (DDG search + URL extraction)
- ANALYST: ResearchAnalystAgent (content scraping + finding extraction)
- CRITIC: CriticalReviewerAgent (bias/gap detection)
- SCRIBE: ReportWriterAgent (structured brief generation)
- Keep same pipeline flow, same JSON outputs
- Add crew.task() chaining for clean orchestration
- Same WebSocket broadcast interface (no frontend changes needed)

## Phase 2: Intelligent Architecture Overhaul
### Backend
- In-memory RunStore → SQLite persistence (survives restarts)
- Add run history API: GET /runs, GET /runs/{id}
- Agent memory: each agent reads prior results from run context
- Token usage tracking per run (already partial, make persistent)
- Error recovery: retry failed LLM calls with backoff
- Configurable agent prompts via env vars (no code changes)

### Frontend
- History page: list past runs with thumbnails
- Run detail view with expandable sections
- WebSocket reconnection improvements
- Export to multiple formats (PDF already exists)

## Phase 3: GitHub Pages Deployment
- Vercel: frontend on vercel.app (fastest, free)
- Render/Railway: backend on render.com (free tier)
- Alternative: Cloudflare Workers for lightweight backend hosting
- Docker Compose for local + cloud parity
- README updated with deployment guide

## Constraints
- Zero test failures
- Demo mode must still work without API keys
- Live mode requires GROQ_API_KEY (same as before)
- All existing API endpoints preserved
