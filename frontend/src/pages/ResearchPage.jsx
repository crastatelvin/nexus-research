import React from 'react'
import AgentCard from '../components/AgentCard'
import AgentGraph from '../components/AgentGraph'
import CritiquePanel from '../components/CritiquePanel'
import LiveFeed from '../components/LiveFeed'
import ProgressRing from '../components/ProgressRing'
import ResearchReport from '../components/ResearchReport'
import SearchBar from '../components/SearchBar'
import SourceCard from '../components/SourceCard'
import { AGENT_ORDER } from '../services/agentMeta'

const WS_STYLES = {
  open: { color: '#9cf5b4', label: 'connected' },
  connecting: { color: '#f3d07a', label: 'connecting' },
  closed: { color: '#ffb4ae', label: 'offline' },
  idle: { color: 'rgba(255,255,255,0.4)', label: 'idle' },
}

function shortRunId(runId) {
  if (!runId) return 'pending'
  return `${runId.slice(0, 8)}…${runId.slice(-4)}`
}

export default function ResearchPage({
  question,
  depth,
  requestedMode,
  resolvedMode,
  runId,
  loading,
  error,
  result,
  events,
  agentStates,
  agentMessages,
  connectionState,
  onSearch,
  onReset,
}) {
  const wsStyle = WS_STYLES[connectionState] || WS_STYLES.idle

  return (
    <main className="mx-auto w-full max-w-[1500px] px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <p className="label-eyebrow">Active Research Run</p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[var(--text-soft)]"
              title={`WebSocket ${connectionState}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${connectionState === 'open' ? 'agent-dot-live' : ''}`}
                style={{ backgroundColor: wsStyle.color }}
              />
              {wsStyle.label}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{question}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="pill font-mono" title={runId || undefined}>
              Run {shortRunId(runId)}
            </span>
            <span className="pill pill-muted capitalize">Depth {depth}</span>
            <span className="pill pill-muted capitalize">Requested {requestedMode}</span>
            {resolvedMode ? (
              <span className="pill pill-muted capitalize">Resolved {resolvedMode}</span>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={onReset} className="ghost-button shrink-0">
          New Research
        </button>
      </div>

      <section className="mt-8">
        <SearchBar
          onSearch={onSearch}
          loading={loading}
          compact
          initialQuestion={question}
          initialDepth={depth}
          initialMode={requestedMode}
        />
      </section>

      {error ? (
        <div
          className="mt-6 rounded-3xl border px-5 py-4 text-sm"
          style={{
            borderColor: 'rgba(255, 110, 102, 0.35)',
            background: 'rgba(255, 110, 102, 0.1)',
            color: 'var(--critic)',
          }}
        >
          {error}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <ProgressRing agentStates={agentStates} />
          <LiveFeed events={events} />
        </div>
        <AgentGraph question={question} agentStates={agentStates} agentMessages={agentMessages} />
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {AGENT_ORDER.map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            status={agentStates[agent] || 'idle'}
            message={agentMessages[agent]}
          />
        ))}
      </section>

      {loading && !result ? (
        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/5 px-6 py-8 md:px-8">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
            </span>
            <p className="label-eyebrow">Report in progress</p>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
            NEXUS is still running. The final brief will render here automatically once the backend marks the run complete.
          </p>
          <div className="mt-5 space-y-2.5">
            {[0.92, 0.78, 0.86, 0.64].map((width, index) => (
              <div
                key={index}
                className="h-2 animate-pulse rounded-full bg-white/8"
                style={{ width: `${width * 100}%`, animationDelay: `${index * 120}ms` }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="label-eyebrow">Source Review</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Discovered evidence</h2>
              </div>
              <p className="text-sm text-[var(--muted)]">{result.sources.length} sources retained</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.sources.map((source, index) => (
                <SourceCard key={source.url} source={source} index={index} />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <CritiquePanel critique={result.critique} />
          </section>

          <section className="mt-8">
            <ResearchReport question={question} report={result.report} sources={result.sources} />
          </section>
        </>
      ) : null}
    </main>
  )
}
