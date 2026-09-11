import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import useResearch from './hooks/useResearch'
import useWebSocket from './hooks/useWebSocket'
import LandingPage from './pages/LandingPage'
import ResearchPage from './pages/ResearchPage'
import HistoryPage from './pages/HistoryPage'
import { listRuns } from './services/api'

function App() {
  const {
    loading, result, error, runId, question, depth,
    requestedMode, resolvedMode, startResearch, fetchRun, reset,
  } = useResearch()
  
  const { events, agentStates, connectionState, lastEvent, reset: resetWebsocket } = useWebSocket(runId)
  
  const [history, setHistory] = useState([])
  const [view, setView] = useState('landing')

  useEffect(() => {
    listRuns(20).then(data => setHistory(data || [])).catch(() => {})
  }, [runId, result, view])

  useEffect(() => {
    if (runId && lastEvent && (lastEvent.event === 'complete' || lastEvent.event === 'error')) {
      fetchRun(runId)
    }
  }, [fetchRun, lastEvent, runId])

  useEffect(() => {
    if (!runId || !loading) return
    const intervalId = window.setInterval(async () => {
      const run = await fetchRun(runId)
      if (!run || run.status === 'complete' || run.status === 'error') {
        window.clearInterval(intervalId)
      }
    }, 2000)
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
      setView('research')
    } catch {}
  }

  const handleReset = () => {
    resetWebsocket()
    reset()
    setView('landing')
  }

  const handleHistorySelect = (run) => {
    reset()
    fetchRun(run.run_id).catch(() => {})
    setView('research')
  }

  const showResearchView = Boolean(question && (runId || loading || result))

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl p-4 flex flex-col">
        {/* Logo */}
        <div className="mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center text-white font-bold text-sm shadow-lg">
              N
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">NEXUS</h1>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Research OS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('landing')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              view === 'landing' 
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30' 
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              view === 'history' 
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30' 
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            History
          </button>
        </div>

        {/* New Research Button */}
        <button 
          onClick={handleReset}
          className="mb-4 w-full rounded-lg border border-[var(--border-default)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-strong)] hover:bg-[var(--bg-glass)] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Research
        </button>

        {/* History List */}
        <div className="flex-1 overflow-y-auto scroll-surface">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-2">
            Recent Runs
          </p>
          {history.map((run) => (
            <button
              key={run.run_id}
              onClick={() => handleHistorySelect(run)}
              className="w-full rounded-lg border border-white/5 px-3 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <div className="truncate font-medium text-white text-sm">{run.question.slice(0, 28)}...</div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    run.status === 'complete' ? 'bg-green-400' :
                    run.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                  }`} />
                  <span className="text-xs text-[var(--text-soft)] capitalize">{run.status}</span>
                </div>
                {run.completed_at && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </button>
          ))}
          {history.length === 0 && !loading && (
            <p className="text-xs text-[var(--text-muted)] px-2 py-4 text-center">
              No research history yet
            </p>
          )}
        </div>

        {/* Status */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 px-2">
            <span className={`h-2 w-2 rounded-full ${
              connectionState === 'open' ? 'bg-green-400 animate-pulse' : 
              connectionState === 'connecting' ? 'bg-yellow-400' : 
              'bg-[var(--text-muted)]'
            }`} />
            <span className="text-xs text-[var(--text-muted)] capitalize">
              {connectionState}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {view === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              <HistoryPage 
                history={history} 
                onSelect={handleHistorySelect}
                onNew={() => setView('landing')}
              />
            </motion.div>
          ) : showResearchView ? (
            <motion.div
              key="research"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LandingPage
                loading={loading}
                error={error}
                onSearch={handleSearch}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
