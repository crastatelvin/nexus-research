import React from 'react'
import { motion } from 'framer-motion'

export default function LandingPage({ onSearch, loading, error }) {
  const [question, setQuestion] = React.useState('')
  const [depth, setDepth] = React.useState('standard')
  const [mode, setMode] = React.useState('auto')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return
    onSearch({ question: question.trim(), depth, mode })
  }

  const exampleQuestions = [
    "What are the latest developments in AI alignment research?",
    "How is quantum computing impacting cryptography?",
    "What are the key trends in sustainable energy for 2026?",
    "How will autonomous vehicles change urban transportation?",
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl"
        >
          {/* Logo */}
          <div className="mb-8 inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-glass)] backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-purple)] flex items-center justify-center text-white font-bold text-sm">
              N
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Multi-Agent Research System
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6 leading-tight">
            Research at the
            <span className="block bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-purple)] bg-clip-text text-transparent">
              Speed of Thought
            </span>
          </h1>

          <p className="text-xl text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed">
            Four specialized AI agents collaborate to transform your questions into structured, evidence-based research briefs.
          </p>

          {/* Search Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <svg 
                  className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]"
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
                  placeholder="What do you want to research?"
                  className="w-full pl-14 pr-6 py-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-white placeholder-[var(--text-muted)] text-lg focus:outline-none focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-primary)]/20 transition-all"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="action-button px-8 text-lg"
              >
                {loading ? 'Running...' : 'Research'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-white text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all cursor-pointer"
                disabled={loading}
              >
                <option value="standard">Standard Depth</option>
                <option value="deep">Deep Analysis</option>
              </select>

              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] text-white text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all cursor-pointer"
                disabled={loading}
              >
                <option value="auto">Auto Mode</option>
                <option value="live">Live (Real API)</option>
                <option value="demo">Demo Mode</option>
              </select>

              <span className="text-xs text-[var(--text-muted)]">
                Using {mode === 'live' ? 'real LLM via OmniRoute' : mode === 'demo' ? 'simulation' : 'auto-selected'}
              </span>
            </div>
          </motion.form>

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 max-w-md mx-auto rounded-lg border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/10 px-5 py-3 text-sm text-[var(--accent-danger)]"
            >
              {error}
            </motion.div>
          )}

          {/* Example Questions */}
          <div className="mt-12">
            <p className="text-sm text-[var(--text-muted)] mb-4">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {exampleQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuestion(q)}
                  className="px-4 py-2 rounded-full border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--accent-primary)] transition-all"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-6"
        >
          {[
            {
              icon: '🔍',
              title: 'SCOUT Agent',
              desc: 'Generates targeted search queries and collects authoritative sources from the web.',
              color: 'var(--agent-scout)',
            },
            {
              icon: '📊',
              title: 'ANALYST Agent',
              desc: 'Extracts key findings from sources and synthesizes patterns across the evidence.',
              color: 'var(--agent-analyst)',
            },
            {
              icon: '⚡',
              title: 'CRITIC Agent',
              desc: 'Stress-tests findings for logical flaws, bias, and missing perspectives.',
              color: 'var(--agent-critic)',
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="panel p-6 text-left"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ background: `${feature.color}20`, border: `1px solid ${feature.color}40` }}
              >
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--text-soft)] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
