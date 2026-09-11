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
  if (!report) return null

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="label-eyebrow">Final Report</p>
          <h2 className="mt-2 text-2xl font-semibold text-white tracking-tight">
            {question || 'Research Brief'}
          </h2>
        </div>
        <ExportButton question={question || ''} report={report} sources={sources} ready />
      </div>

      <div className="space-y-4">
        {reportSections.map(([label, key], i) => (
          <motion.article
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5"
          >
            <p className="label-eyebrow mb-3">{label}</p>
            <p className="text-base leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
              {report[key]}
            </p>
          </motion.article>
        ))}

        {report.key_findings?.length > 0 && (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5"
          >
            <p className="label-eyebrow mb-3">Key Findings</p>
            <ol className="space-y-2">
              {report.key_findings.map((item, i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed text-[var(--text-secondary)]">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </motion.article>
        )}

        {report.recommendations?.length > 0 && (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 p-5"
          >
            <p className="label-eyebrow mb-3" style={{ color: 'var(--accent-primary)' }}>
              Recommendations
            </p>
            <ul className="space-y-2">
              {report.recommendations.map((item, i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed text-[var(--text-secondary)]">
                  <span className="text-[var(--accent-primary)] mt-1">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        )}

        {sources?.length > 0 && (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5"
          >
            <p className="label-eyebrow mb-3">Cited Sources</p>
            <ul className="space-y-2 text-sm">
              {sources.map((source) => (
                <li key={source.url} className="flex items-start gap-2 p-3 rounded-lg hover:bg-[var(--bg-glass)] transition-colors">
                  <span className="text-[var(--accent-primary)] mt-0.5">📎</span>
                  <div>
                    <span className="font-medium text-white">{source.title}</span>
                    <div className="mt-1 break-all text-[var(--accent-soft)] text-xs">{source.url}</div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.article>
        )}
      </div>
    </section>
  )
}
