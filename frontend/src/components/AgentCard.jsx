import React from 'react'
import { motion } from 'framer-motion'

export default function AgentCard({ agent, status, message }) {
  const meta = {
    SCOUT: { color: 'var(--agent-scout)', tone: 'Researcher', description: 'Maps coverage' },
    ANALYST: { color: 'var(--agent-analyst)', tone: 'Analyst', description: 'Extracts insights' },
    CRITIC: { color: 'var(--agent-critic)', tone: 'Critic', description: 'Stress-tests' },
    SCRIBE: { color: 'var(--agent-scribe)', tone: 'Writer', description: 'Synthesizes report' },
  }[agent] || { color: 'var(--text-muted)', tone: agent, description: '' }

  const isActive = status === 'active'
  const isComplete = status === 'complete'

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className="panel relative overflow-hidden"
      style={{
        borderColor: isActive || isComplete ? `${meta.color}40` : undefined,
        boxShadow: isActive ? `0 8px 32px ${meta.color}20` : undefined,
      }}
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100" 
           style={{ color: meta.color }} />
      
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
          >
            {agent === 'SCOUT' && '🔍'}
            {agent === 'ANALYST' && '📊'}
            {agent === 'CRITIC' && '⚡'}
            {agent === 'SCRIBE' && '✍️'}
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: meta.color }}>
              {meta.tone}
            </p>
            <h3 className="font-semibold text-white text-sm">{agent}</h3>
          </div>
        </div>
        <span 
          className="status-chip text-xs"
          style={{ 
            borderColor: `${meta.color}30`,
            color: isComplete ? '#48bb78' : isActive ? meta.color : 'var(--text-muted)',
            background: `${meta.color}10`,
          }}
        >
          {isComplete ? 'Done' : isActive ? 'Active' : 'Idle'}
        </span>
      </div>

      {/* Pulse dots */}
      <div className="flex gap-1.5 mb-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${isActive ? 'agent-dot-live' : 'bg-[var(--text-muted)]/30'}`}
            style={isActive ? { 
              animationDelay: `${i * 150}ms`, 
              backgroundColor: meta.color 
            } : undefined}
          />
        ))}
      </div>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed min-h-[40px]">
        {message || `Waiting for ${agent.toLowerCase()}...`}
      </p>
    </motion.article>
  )
}
