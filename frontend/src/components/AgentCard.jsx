import React from 'react'
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion'

import { ACTIVE_STATUSES, AGENT_META, COMPLETE_STATUSES } from '../services/agentMeta'

export default function AgentCard({ agent, status, message }) {
  const meta = AGENT_META[agent]
  const isActive = ACTIVE_STATUSES.has(status)
  const isComplete = COMPLETE_STATUSES.has(status)
  const statusLabel = isComplete ? 'Complete' : isActive ? 'Active' : status === 'error' ? 'Error' : 'Idle'

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel relative overflow-hidden"
      style={{
        borderColor: isActive || isComplete ? `${meta.color}55` : undefined,
        boxShadow: isActive ? `0 20px 50px ${meta.color}20` : undefined,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: isActive || isComplete ? `linear-gradient(90deg, transparent, ${meta.color}, transparent)` : 'transparent',
        }}
      />

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow" style={{ color: meta.color }}>
            {meta.tone}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{agent}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{meta.description}</p>
        </div>
        <span
          className="status-chip"
          style={{
            borderColor: `${meta.color}55`,
            color: isComplete ? '#b9ffcc' : meta.color,
            background: `${meta.color}14`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className={`h-2.5 w-2.5 rounded-full transition ${isActive ? 'agent-dot-live' : 'bg-white/8'}`}
            style={isActive ? { animationDelay: `${item * 160}ms`, backgroundColor: meta.color } : undefined}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={message || status}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="min-h-14 text-sm leading-6 text-[var(--text-soft)]"
        >
          {message || `${agent} is waiting for work.`}
        </motion.p>
      </AnimatePresence>
    </motion.article>
  )
}

