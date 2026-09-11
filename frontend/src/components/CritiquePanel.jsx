import React from 'react'
import { motion } from 'framer-motion'

export default function CritiquePanel({ critique }) {
  if (!critique) return null

  const rating = (critique.confidence?.rating || 'MEDIUM').toUpperCase()
  
  const styles = {
    HIGH: { color: '#48bb78', bg: 'rgba(72, 187, 120, 0.1)', border: 'rgba(72, 187, 120, 0.3)' },
    MEDIUM: { color: '#f6ad55', bg: 'rgba(246, 173, 85, 0.1)', border: 'rgba(246, 173, 85, 0.3)' },
    LOW: { color: '#f56565', bg: 'rgba(245, 101, 101, 0.1)', border: 'rgba(245, 101, 101, 0.3)' },
  }[rating] || styles.MEDIUM

  const sections = [
    { label: 'Logical Flaws', key: 'logical_flaws', icon: '🔴' },
    { label: 'Missing Perspectives', key: 'missing_perspectives', icon: '🟡' },
    { label: 'Bias Risks', key: 'bias_risks', icon: '🟠' },
    { label: 'Overstatements', key: 'overstatements', icon: '🟣' },
    { label: 'Reliability Concerns', key: 'reliability_concerns', icon: '⚪' },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="label-eyebrow">Adversarial Review</p>
          <h3 className="text-lg font-semibold text-white mt-1">Critic Analysis</h3>
        </div>
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{ 
            color: styles.color, 
            borderColor: styles.border,
            background: styles.bg
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: styles.color }} />
          <span className="text-sm font-semibold">{rating} Confidence</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ label, key, icon }, i) => (
          <motion.article
            key={key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">{icon}</span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {label}
              </h4>
            </div>
            {critique[key]?.length ? (
              <ul className="space-y-2">
                {critique[key].map((item, j) => (
                  <li key={j} className="text-sm text-[var(--text-soft)] leading-relaxed">
                    <span className="text-[var(--accent-danger)]/70 mr-2">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">None identified</p>
            )}
          </motion.article>
        ))}
      </div>

      {critique.confidence?.justification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-5 py-4 text-sm text-[var(--text-soft)] leading-relaxed"
        >
          <span className="font-semibold text-white">Analysis:</span>{' '}
          {critique.confidence.justification}
        </motion.div>
      )}
    </motion.section>
  )
}
