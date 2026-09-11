import React from 'react'
import { useEffect, useState } from 'react'

import useResearch from './hooks/useResearch'
import useWebSocket from './hooks/useWebSocket'
import LandingPage from './pages/LandingPage'
import ResearchPage from './pages/ResearchPage'
import { listRuns } from './services/api'

function App() {
  const {
    loading,
    result,
    error,
    runId,
    question,
    depth,
    requestedMode,
    resolvedMode,
    startResearch,
    fetchRun,
    reset,
  } = useResearch()
  const { events, agentStates, connectionState, lastEvent, reset: resetWebsocket } = useWebSocket(runId)

  const [history, setHistory] = useState([])

  useEffect(() => {
    listRuns(10).then(data => setHistory(data || [])).catch(() => {})
  }, [runId, result])

  useEffect(() => {
    if (!runId || !lastEvent) {
      return
    }

    if (lastEvent.event === 'complete' || lastEvent.event === 'error') {
      fetchRun(runId)
    }
  }, [fetchRun, lastEvent, runId])

  useEffect(() => {
    if (!runId || !loading) {
      return
    }

    const intervalId = window.setInterval(async () => {
      const run = await fetchRun(runId)
      if (!run || run.status === 'complete' || run.status === 'error') {
        window.clearInterval(intervalId)
      }
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [fetchRun, loading, runId])

  const agentMessages = {}
  for (const event of events) {
    if (event.agent && event.agent !== 'NEXUS') {
      agentMessages[event.agent] = event.message
    }
  }

  const handleSearch = async (payload) => {
    resetWebsocket()
    try {
      await startResearch(payload)
    } catch {
      // The hook already stores the user-facing error state.
    }
  }

  const handleReset = () => {
    resetWebsocket()
    reset()
  }

  const showResearchView = Boolean(question && (runId || loading || result))

  return (
    <div className="min-h-screen flex">
      {/* History Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-black/30 p-4 overflow-y-auto">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-soft)]">History</h2>
        <button onClick={handleReset} className="mb-3 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10 transition">
          + New Research
        </button>
        <div className="space-y-2">
          {history.map((run) => (
            <button
              key={run.run_id}
              onClick={() => { reset(); fetchRun(run.run_id).catch(() => {}) }}
              className="w-full rounded-lg border border-white/5 px-3 py-2 text-left text-xs hover:bg-white/5 transition"
            >
              <div className="truncate font-medium text-white">{run.question.slice(0, 30)}...</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${
                  run.status === 'complete' ? 'bg-green-400' :
                  run.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                }`} />
                <span className="text-[var(--text-soft)]">{run.status}</span>
              </div>
            </button>
          ))}
          {history.length === 0 && !loading && (
            <p className="text-xs text-[var(--text-soft)]">No runs yet</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {showResearchView ? (
          <ResearchPage
            question={question}
            depth={depth}
            requestedMode={requestedMode}
            resolvedMode={resolvedMode}
            runId={runId}
            loading={loading}
            error={error}
            result={result}
            events={events}
            agentStates={agentStates}
            agentMessages={agentMessages}
            connectionState={connectionState}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        ) : (
          <LandingPage
            loading={loading}
            error={error}
            onSearch={handleSearch}
          />
        )}
      </main>
    </div>
  )
}

export default App
