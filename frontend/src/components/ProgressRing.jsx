import React from 'react'
import { motion } from 'framer-motion'

export default function ProgressRing({ agentStates }) {
  const completed = ['SCOUT', 'ANALYST', 'CRITIC', 'SCRIBE'].filter(
    (agent) => agentStates[agent] === 'complete'
  ).length
  const active = ['SCOUT', 'ANALYST', 'CRITIC', 'SCRIBE'].find(
    (agent) => agentStates[agent] === 'active'
  )
  const progress = Math.round((completed / 4) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="panel flex items-center gap-5"
    >
      {/* Circular Progress */}
      <div className="relative">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          {/* Progress arc */}
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            initial={{ strokeDashoffset: `${2 * Math.PI * 34}` }}
            animate={{ strokeDashoffset: `${2 * Math.PI * 34 * (1 - progress / 100)}` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-primary)" />
              <stop offset="100%" stopColor="var(--accent-purple)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-white">{progress}%</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="label-eyebrow">Pipeline Progress</p>
        <h3 className="text-lg font-semibold text-white mt-1">
          {completed} of 4 Agents Complete
        </h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          {active ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] agent-dot-live" />
              <span className="text-[var(--accent-primary)]">{active}</span> is currently working...
            </span>
          ) : completed === 4 ? (
            <span className="flex items-center gap-2 text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              All agents complete!
            </span>
          ) : (
            'Waiting for agents to complete...'
          )}
        </p>
      </div>
    </motion.div>
  )
}
