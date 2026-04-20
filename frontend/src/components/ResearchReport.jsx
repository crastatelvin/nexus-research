import React from 'react'

import ExportButton from './ExportButton'

const reportSections = [
  ['Executive Summary', 'executive_summary'],
  ['Background', 'background'],
  ['Analysis', 'analysis'],
  ['Critical Perspectives', 'critical_perspectives'],
  ['Conclusion', 'conclusion'],
]

export default function ResearchReport({ question, report, sources }) {
  if (!report) {
    return null
  }

  return (
    <section className="panel">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow">Final Report</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{question}</h2>
        </div>
        <ExportButton question={question} report={report} sources={sources} ready />
      </div>

      <div className="space-y-5 rounded-[32px] border border-white/8 bg-black/14 p-6 md:p-8">
        {reportSections.map(([label, key]) => (
          <article key={key} className="report-section">
            <p className="label-eyebrow">{label}</p>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[var(--text-soft)]">
              {report[key]}
            </p>
          </article>
        ))}

        <article className="report-section">
          <p className="label-eyebrow">Key Findings</p>
          <ol className="mt-4 space-y-3 text-base leading-8 text-[var(--text-soft)]">
            {report.key_findings.map((item) => (
              <li key={item} className="rounded-3xl border border-white/8 bg-white/4 px-5 py-4">
                {item}
              </li>
            ))}
          </ol>
        </article>

        <article className="report-section">
          <p className="label-eyebrow">Recommendations</p>
          <ul className="mt-4 space-y-3 text-base leading-8 text-[var(--text-soft)]">
            {report.recommendations.map((item) => (
              <li key={item} className="rounded-3xl border border-white/8 bg-white/4 px-5 py-4">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="report-section">
          <p className="label-eyebrow">Cited Sources</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-soft)]">
            {sources.map((source) => (
              <li key={source.url} className="rounded-3xl border border-white/8 bg-black/14 px-5 py-4">
                <span className="font-semibold text-white">{source.title}</span>
                <div className="mt-2 break-all text-[var(--accent-soft)]">{source.url}</div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

