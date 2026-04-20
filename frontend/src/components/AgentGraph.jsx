import React from 'react'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'

import { ACTIVE_STATUSES, AGENT_META } from '../services/agentMeta'

function QuestionNode({ data }) {
  return (
    <div className="graph-node graph-node-question">
      <p className="label-eyebrow">Question</p>
      <h3 className="mt-3 text-lg font-semibold text-white line-clamp-3">{data.label}</h3>
      <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
        NEXUS routes the research run through a visible chain of search, analysis, critique, and synthesis.
      </p>
      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

function AgentNode({ data }) {
  const meta = AGENT_META[data.label]
  const isActive = ACTIVE_STATUSES.has(data.status)
  const isComplete = data.status === 'complete'

  return (
    <div
      className="graph-node"
      style={{
        borderColor: isActive || isComplete ? `${meta.color}70` : 'rgba(255,255,255,0.08)',
        boxShadow: isActive ? `0 16px 40px ${meta.color}18` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="graph-handle" />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="label-eyebrow truncate" style={{ color: meta.color }}>
            {meta.tone}
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">{data.label}</h3>
        </div>
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${isActive ? 'agent-dot-live' : ''}`}
          style={{ backgroundColor: isActive || isComplete ? meta.color : 'rgba(255,255,255,0.18)' }}
        />
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">
        {data.message || meta.description}
      </p>
      <p className="mt-4 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
        Status: {data.status}
      </p>
      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

const nodeTypes = {
  question: QuestionNode,
  agent: AgentNode,
}

const NODE_WIDTH = 260
const NODE_GAP = 90
const STEP = NODE_WIDTH + NODE_GAP

export default function AgentGraph({ question, agentStates, agentMessages }) {
  const nodes = [
    {
      id: 'question',
      type: 'question',
      position: { x: 0, y: 140 },
      draggable: false,
      selectable: false,
      data: { label: question },
    },
    {
      id: 'SCOUT',
      type: 'agent',
      position: { x: STEP + 40, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        label: 'SCOUT',
        status: agentStates.SCOUT || 'idle',
        message: agentMessages.SCOUT,
      },
    },
    {
      id: 'ANALYST',
      type: 'agent',
      position: { x: STEP * 2 + 40, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        label: 'ANALYST',
        status: agentStates.ANALYST || 'idle',
        message: agentMessages.ANALYST,
      },
    },
    {
      id: 'CRITIC',
      type: 'agent',
      position: { x: STEP * 3 + 40, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        label: 'CRITIC',
        status: agentStates.CRITIC || 'idle',
        message: agentMessages.CRITIC,
      },
    },
    {
      id: 'SCRIBE',
      type: 'agent',
      position: { x: STEP * 4 + 40, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        label: 'SCRIBE',
        status: agentStates.SCRIBE || 'idle',
        message: agentMessages.SCRIBE,
      },
    },
  ]

  const edges = [
    { id: 'question-scout', source: 'question', target: 'SCOUT' },
    { id: 'scout-analyst', source: 'SCOUT', target: 'ANALYST' },
    { id: 'analyst-critic', source: 'ANALYST', target: 'CRITIC' },
    { id: 'critic-scribe', source: 'CRITIC', target: 'SCRIBE' },
  ].map((edge) => {
    const sourceStatus = agentStates[edge.source]
    const targetStatus = agentStates[edge.target]
    const active = ACTIVE_STATUSES.has(sourceStatus) || ACTIVE_STATUSES.has(targetStatus)
    const completed = sourceStatus === 'complete' || targetStatus === 'complete'
    const edgeColor = active || completed ? AGENT_META[edge.target]?.color || '#5aa6ff' : 'rgba(255,255,255,0.12)'

    return {
      ...edge,
      animated: active,
      selectable: false,
      style: {
        stroke: edgeColor,
        strokeWidth: active || completed ? 2.5 : 1.25,
      },
    }
  })

  return (
    <div className="panel h-[520px] overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow">Live Agent Graph</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Run topology</h3>
        </div>
        <p className="max-w-xs text-sm text-[var(--muted)]">
          The graph mirrors live status events from the backend websocket.
        </p>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          fitView
          fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
          minZoom={0.2}
          maxZoom={1.1}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
          className="rounded-3xl bg-transparent"
        >
          <Background color="rgba(255,255,255,0.08)" gap={28} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
