import React from 'react'
import { motion } from 'framer-motion'

export default function SearchBar({ onSearch, loading, compact, initialQuestion, initialDepth, initialMode }) {
  const [question, setQuestion] = React.useState(initialQuestion || '')
  const [depth, setDepth] = React.useState(initialDepth || 'standard')
  const [mode, setMode] = React.useState(initialMode || 'auto')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSearch({ question: question.trim(), depth, mode })
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 ${compact ? '' : 'max-w-3xl'}`}
    >
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <svg 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your research question..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
            disabled={loading}
          />
        </div>
        
        <select
          value={depth}
          onChange={(e) => setDepth(e.target.value)}
          className="px-4 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-white focus:outline-none focus:border-[var(--accent-primary)] transition-all cursor-pointer"
          disabled={loading}
        >
          <option value="standard">Standard</option>
          <option value="deep">Deep</option>
        </select>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="px-4 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-white focus:outline-none focus:border-[var(--accent-primary)] transition-all cursor-pointer"
          disabled={loading}
        >
          <option value="auto">Auto</option>
          <option value="live">Live</option>
          <option value="demo">Demo</option>
        </select>

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="action-button px-6"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running...
            </>
          ) : (
            'Research'
          )}
        </button>
      </div>

      {!compact && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Powered by multi-agent AI pipeline · {mode === 'live' ? 'Real-time web search with LLM analysis' : mode === 'demo' ? 'Simulation mode for testing' : 'Auto-detects optimal mode'}
        </p>
      )}
    </motion.form>
  )
}
