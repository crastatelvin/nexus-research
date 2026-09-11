import React, { useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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
  open: { color: '#48bb78', label: 'Connected' },
  connecting: { color: '#f6ad55', label: 'Connecting' },
  closed: { color: '#f56565', label: 'Offline' },
  idle: { color: 'rgba(255,255,255,0.3)', label: 'Idle' },
}

function shortRunId(runId) {
  if (!runId) return 'pending'
  return `${runId.slice(0, 6)}...${runId.slice(-4)}`
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
  const mainRef = useRef(null)

  // Auto-scroll to top on new run
  useEffect(() => {
    if (mainRef.current && runId) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [runId])

  return (
    <motion.main 
      ref={mainRef}
      className="h-full overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="label-eyebrow">Research Pipeline</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-glass)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connectionState === 'open' ? 'agent-dot-live' : ''}`}
                    style={{ backgroundColor: wsStyle.color }}
                  />
                  {wsStyle.label}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight md:text-3xl">
                {question}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="pill pill-accent font-mono" title={runId}>
                  #{shortRunId(runId)}
                </span>
                <span className="pill pill-muted capitalize">{depth}</span>
                <span className="pill pill-muted capitalize">{requestedMode}</span>
                {resolvedMode && resolvedMode !== requestedMode && (
                  <span className="pill pill-muted capitalize">→ {resolvedMode}</span>
                )}
              </div>
            </div>
            <button type="button" onClick={onReset} className="ghost-button shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* Search Bar */}
        <section>
          <SearchBar
            onSearch={onSearch}
            loading={loading}
            compact
            initialQuestion={question}
            initialDepth={depth}
            initialMode={requestedMode}
          />
        </section>

        {/* Error State */}
        <AnimatePresence>
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/10 px-5 py-4 text-sm text-[var(--accent-danger)]"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Active Pipeline */}
        {!result && !loading ? (
          <EmptyState onSearch={onSearch} />
        ) : loading && !result ? (
          <PipelineInProgress
            agentStates={agentStates}
            events={events}
          />
        ) : result ? (
          <ResultView
            result={result}
            agentStates={agentStates}
            events={events}
          />
        ) : null}
      </div>
    </motion.main>
  )
}

// Empty state when no research is running
function EmptyState({ onSearch }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-purple)]/20 border border-[var(--border-default)]">
        <svg className="w-10 h-10 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-white mb-2">Ready to Research</h2>
      <p className="text-[var(--text-secondary)] max-w-md">
        Enter a question and our multi-agent system will scout, analyze, critique, and synthesize a comprehensive brief.
      </p>
    </motion.div>
  )
}

// Pipeline in progress view
function PipelineInProgress({ agentStates, events }) {
  const completed = AGENT_ORDER.filter(a => agentStates[a] === 'complete').length
  const active = AGENT_ORDER.find(a => agentStates[a] === 'active')
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Progress Overview */}
      <div className="panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="label-eyebrow">Pipeline Status</p>
            <h3 className="text-lg font-semibold text-white mt-1">
              {completed}/{AGENT_ORDER.length} Agents Complete
            </h3>
          </div>
          {active && (
            <span className="flex items-center gap-2 text-sm text-[var(--accent-primary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] agent-dot-live" />
              {active} working...
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-[var(--bg-glass)] border border-[var(--border-subtle)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-purple)]"
            initial={{ width: 0 }}
            animate={{ width: `${(completed / AGENT_ORDER.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Agent Steps */}
        <div className="mt-4 flex gap-2">
          {AGENT_ORDER.map((agent) => {
            const state = agentStates[agent]
            const meta = {
              SCOUT: { color: 'var(--agent-scout)', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
              ANALYST: { color: 'var(--agent-analyst)', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              CRITIC: { color: 'var(--agent-critic)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              SCRIBE: { color: 'var(--agent-scribe)', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
            }[agent]
            
            return (
              <div key={agent} className="flex-1">
                <div className={`rounded-lg border px-3 py-2 text-center transition-all ${
                  state === 'complete' ? 'border-green-500/30 bg-green-500/10' :
                  state === 'active' ? 'border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/10' :
                  'border-[var(--border-subtle)] bg-[var(--bg-glass)]'
                }`}>
                  <svg className={`w-4 h-4 mx-auto mb-1 ${
                    state === 'complete' ? 'text-green-400' :
                    state === 'active' ? 'text-[var(--accent-primary)]' :
                    'text-[var(--text-muted)]'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
                  </svg>
                  <span className={`text-xs font-medium ${
                    state === 'complete' ? 'text-green-400' :
                    state === 'active' ? 'text-[var(--accent-primary)]' :
                    'text-[var(--text-muted)]'
                  }`}>{agent}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live Events */}
      <div className="grid gap-4 md:grid-cols-2">
        <LiveFeed events={events} />
        <AgentGraph 
          question="" 
          agentStates={agentStates} 
          agentMessages={agentMessages || {}} 
        />
      </div>

      {/* Loading Skeleton */}
      <div className="panel">
        <div className="flex items-center gap-3 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
          </span>
          <p className="label-eyebrow">Generating Report</p>
        </div>
        <div className="space-y-3">
          {[40, 65, 50, 80, 35].map((width, i) => (
            <div key={i} className="h-3 rounded-full bg-[var(--bg-glass)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)]/40 to-[var(--accent-purple)]/40"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  ease: 'easeInOut',
                  delay: i * 0.15 
                }}
                style={{ width: `${width}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Result view with professional layout
function ResultView({ result, agentStates, events }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Sources" value={result.sources.length} icon="🔍" />
        <StatCard label="Findings" value={result.findings.reduce((acc, f) => acc + f.findings.length, 0)} icon="📊" />
        <StatCard label="Themes" value={result.synthesis.key_themes.length} icon="🎯" />
        <StatCard label="Confidence" value={result.critique.confidence.rating} icon="✓" />
      </div>

      {/* Executive Summary - Hero Section */}
      <section className="panel">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="label-eyebrow">Executive Summary</p>
            <h2 className="text-xl font-semibold text-white mt-1">Key Insights</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            result.critique.confidence.rating === 'HIGH' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            result.critique.confidence.rating === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {result.critique.confidence.rating} Confidence
          </span>
        </div>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          {result.report.executive_summary}
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Sources & Findings */}
        <div className="lg:col-span-1 space-y-6">
          <SourcesSection sources={result.sources} />
          <FindingsSection findings={result.findings} />
        </div>

        {/* Right: Report Content */}
        <div className="lg:col-span-2 space-y-6">
          <ResearchReport 
            question="" 
            report={result.report} 
            sources={result.sources} 
          />
          <CritiquePanel critique={result.critique} />
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, icon }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="panel p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </motion.div>
  )
}

function SourcesSection({ sources }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="label-eyebrow">Evidence Base</p>
        <span className="text-xs text-[var(--text-muted)]">{sources.length} sources</span>
      </div>
      <div className="space-y-3">
        {sources.map((source, i) => (
          <motion.div
            key={source.url}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <SourceCard source={source} index={i} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FindingsSection({ findings }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <p className="label-eyebrow">Extracted Findings</p>
        <span className="text-xs text-[var(--text-muted)]">
          {findings.reduce((acc, f) => acc + f.findings.length, 0)} total
        </span>
      </div>
      <div className="space-y-3">
        {findings.map((finding, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-4"
          >
            <p className="text-xs font-mono text-[var(--accent-primary)] mb-2 uppercase tracking-wider">
              {finding.source.title.split('/')[0]?.slice(0, 20)}...
            </p>
            <ul className="space-y-2">
              {finding.findings.slice(0, 3).map((fi, j) => (
                <li key={j} className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  • {fi.statement}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
