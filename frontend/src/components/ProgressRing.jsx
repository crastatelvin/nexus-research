import React from 'react'
import { AGENT_ORDER } from '../services/agentMeta'

export default function ProgressRing({ agentStates }) {
  const completed = AGENT_ORDER.filter((agent) => agentStates[agent] === 'complete').length
  const progress = Math.round((completed / AGENT_ORDER.length) * 100)

  return (
    <div className="panel flex items-center gap-5">
      <div
        className="grid h-20 w-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--accent) ${progress}%, rgba(255,255,255,0.08) 0)`,
        }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[var(--bg)] text-sm font-semibold text-white">
          {progress}%
        </div>
      </div>
      <div>
        <p className="label-eyebrow">Pipeline Progress</p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          {completed} of {AGENT_ORDER.length} agents complete
        </h3>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Each stage updates independently as websocket events arrive.
        </p>
      </div>
    </div>
  )
}

