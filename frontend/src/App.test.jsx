import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createResearchRun, getResearchRun } from './services/api'

vi.mock('./services/api', () => ({
  createResearchRun: vi.fn(),
  getResearchRun: vi.fn(),
  getLatestResearch: vi.fn(),
  getWebSocketUrl: () => 'ws://localhost:8000/ws',
}))

class MockWebSocket {
  static instances = []

  constructor(url) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => this.onopen?.(), 0)
  }

  close() {
    this.onclose?.()
  }

  emit(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }
}

const completeRun = {
  run_id: 'run-1',
  question: 'What is agentic research?',
  depth: 'standard',
  mode: 'demo',
  status: 'complete',
  error: null,
  result: {
    question: 'What is agentic research?',
    depth: 'standard',
    mode: 'demo',
    queries: ['agentic research latest evidence', 'agentic research expert analysis', 'agentic research risks'],
    sources: [
      {
        title: 'Agentic Research Signal Brief',
        url: 'https://example.com/agentic',
        snippet: 'A demo source',
      },
    ],
    findings: [],
    synthesis: {
      key_themes: ['Theme one'],
      consensus_points: ['Consensus'],
      conflicting_points: ['Conflict'],
      knowledge_gaps: ['Gap'],
    },
    critique: {
      logical_flaws: ['Flaw'],
      missing_perspectives: ['Perspective'],
      bias_risks: ['Bias'],
      overstatements: ['Overstatement'],
      reliability_concerns: ['Concern'],
      confidence: {
        rating: 'MEDIUM',
        justification: 'Needs more evidence.',
      },
    },
    report: {
      executive_summary: 'Summary',
      background: 'Background',
      key_findings: ['Finding A', 'Finding B'],
      analysis: 'Analysis',
      critical_perspectives: 'Critical',
      conclusion: 'Conclusion',
      recommendations: ['Recommendation A'],
    },
  },
}

describe('App', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    globalThis.WebSocket = MockWebSocket
    window.WebSocket = MockWebSocket
    createResearchRun.mockResolvedValue({ run_id: 'run-1', status: 'queued' })
    getResearchRun.mockResolvedValue(completeRun)
  })

  it('moves from the landing page into the research workspace and loads the report on completion', async () => {
    render(<App />)

    fireEvent.change(screen.getByPlaceholderText(/ask NEXUS a research question/i), {
      target: { value: 'What is agentic research?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start research/i }))

    expect(await screen.findByText(/Active Research Run/i)).toBeInTheDocument()

    await waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0))
    MockWebSocket.instances.at(-1).emit({
      run_id: 'run-1',
      event: 'complete',
      agent: 'NEXUS',
      status: 'complete',
      message: 'done',
    })

    expect(await screen.findByText('Executive Summary')).toBeInTheDocument()
    expect(screen.getByText('Recommendation A')).toBeInTheDocument()
  })
})
