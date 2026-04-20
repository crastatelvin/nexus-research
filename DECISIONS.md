# NEXUS Decisions

## Why Vite instead of CRA?

The handoff referenced `react-scripts`, but Vite gives a faster local loop, simpler modern config, and pairs cleanly with Tailwind 4 and Vitest.

## Why `@xyflow/react` instead of `reactflow`?

React Flow now ships as `@xyflow/react`. The graph visualization is central to the experience, so the implementation uses the current package and CSS entrypoint.

## Why a run-based backend?

The handoff used one long blocking POST request. A run store keyed by `run_id` keeps the API responsive, makes websocket updates easier to reason about, and creates a clean path to future persistence.

## Why keep sequential agents?

SCOUT feeds ANALYST, ANALYST feeds CRITIC, and SCRIBE depends on all three. The orchestration stays sequential at the agent level while still parallelizing search and source fetch work inside the safe stages.

## Why keep demo mode?

The project should run on a fresh machine without requiring secrets first. Demo mode preserves the live product flow for local development, portfolio demos, and automated tests.

## Why structured outputs?

The handoff parsed freeform text sections. The implementation validates JSON-shaped agent outputs so the backend can safely assemble the UI payload and the frontend can render predictable sections.

