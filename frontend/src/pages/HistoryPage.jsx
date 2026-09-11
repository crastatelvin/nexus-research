import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function HistoryPage({ history, onSelect, onNew }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-400'
      case 'error': return 'bg-red-400'
      default: return 'bg-yellow-400'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'complete': return 'Completed'
      case 'error': return 'Failed'
      default: return status
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen"
    >
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="label-eyebrow">Research Archive</p>
            <h1 className="text-3xl font-semibold text-white mt-2">History</h1>
          </div>
          <button onClick={onNew} className="ghost-button">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Research
          </button>
        </div>

        {/* History List */}
        <AnimatePresence mode="wait">
          {history.length > 0 ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {history.map((run, i) => (
                <motion.button
                  key={run.run_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => onSelect(run)}
                  className="w-full text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white group-hover:text-[var(--accent-primary)] transition-colors truncate">
                        {run.question}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          {run.run_id.slice(0, 8)}...
                        </span>
                        <span className="text-xs text-[var(--text-muted)] capitalize">
                          {run.depth}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] capitalize">
                          {run.mode}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        {run.completed_at && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {new Date(run.completed_at).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-xs text-[var(--text-muted)]">
                          {run.completed_at && new Date(run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(run.status)}`} />
                        <span className={`text-xs font-medium ${
                          run.status === 'complete' ? 'text-green-400' :
                          run.status === 'error' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {getStatusLabel(run.status)}
                        </span>
                      </div>
                      <svg 
                        className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors"
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-glass)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No History Yet</h3>
              <p className="text-[var(--text-soft)] mb-6">Start your first research to see it here.</p>
              <button onClick={onNew} className="action-button">
                Start Research
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
