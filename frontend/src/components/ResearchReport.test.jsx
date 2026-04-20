import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import ExportButton from './ExportButton'
import ResearchReport from './ResearchReport'

const report = {
  executive_summary: 'Summary',
  background: 'Background',
  key_findings: ['Finding one', 'Finding two'],
  analysis: 'Analysis',
  critical_perspectives: 'Critical',
  conclusion: 'Conclusion',
  recommendations: ['Recommendation one'],
}

describe('ResearchReport', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders structured report sections and cited sources', () => {
    render(
      <ResearchReport
        question="What is agentic research?"
        report={report}
        sources={[
          {
            title: 'Source One',
            url: 'https://example.com/one',
            snippet: 'Example snippet',
          },
        ]}
      />
    )

    expect(screen.getByText('Executive Summary')).toBeInTheDocument()
    expect(screen.getByText('Finding one')).toBeInTheDocument()
    expect(screen.getByText('Recommendation one')).toBeInTheDocument()
    expect(screen.getByText('Source One')).toBeInTheDocument()
  })

  it('exposes disabled and ready export states', () => {
    const { rerender, getByRole } = render(
      <ExportButton question="test" report={null} sources={[]} ready={false} />
    )
    expect(getByRole('button', { name: /export pdf/i })).toBeDisabled()

    rerender(<ExportButton question="test" report={report} sources={[]} ready />)
    expect(getByRole('button', { name: /export pdf/i })).toBeEnabled()
  })
})
