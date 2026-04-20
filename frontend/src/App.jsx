import React from 'react'
import { useEffect } from 'react'

import useResearch from './hooks/useResearch'
import useWebSocket from './hooks/useWebSocket'
import LandingPage from './pages/LandingPage'
import ResearchPage from './pages/ResearchPage'

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
    <div className="min-h-screen">
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
    </div>
  )
}

export default App
