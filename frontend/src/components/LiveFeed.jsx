import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LiveFeed({ events }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events])

  const agentColors = {
    SCOUT: 'var(--agent-scout)',
    ANALYST: 'var(--agent-analyst)',
    CRITIC: 'var(--agent-critic)',
    SCRIBE: 'var(--agent-scribe)',
    NEXUS: 'var(--accent-primary)',
  }

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel min-h-[320px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-eyebrow">Live Feed</p>
          <h3 className="text-lg font-semibold text-white mt-1">Event Stream</h3>
        </div>
        <span className="text-xs text-[var(--text-muted)] font-mono">
          {events.length} events
        </span>
      </div>

      <div className="scroll-surface flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {events.length ? (
            events.map((event, index) => (
              <motion.article
                key={`${event.received_at}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-3"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span 
                    className="text-sm font-semibold"
                    style={{ color: agentColors[event.agent] || 'var(--text-secondary)' }}
                  >
                    {event.agent}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
                    {event.event}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                  {event.message}
                </p>
              </motion.article>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] text-sm text-[var(--text-muted)]"
            >
              Events will appear here once a run starts
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </motion.section>
  )
}
