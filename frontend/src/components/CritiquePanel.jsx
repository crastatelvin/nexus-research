import React from 'react'

const sections = [
  ['Logical flaws', 'logical_flaws'],
  ['Missing perspectives', 'missing_perspectives'],
  ['Bias risks', 'bias_risks'],
  ['Overstatements', 'overstatements'],
  ['Reliability concerns', 'reliability_concerns'],
]

const CONFIDENCE_STYLES = {
  HIGH: {
    color: '#9cf5b4',
    borderColor: 'rgba(101, 224, 148, 0.45)',
    background: 'rgba(101, 224, 148, 0.12)',
  },
  MEDIUM: {
    color: '#f3d07a',
    borderColor: 'rgba(243, 180, 79, 0.45)',
    background: 'rgba(243, 180, 79, 0.12)',
  },
  LOW: {
    color: '#ffb4ae',
    borderColor: 'rgba(255, 110, 102, 0.45)',
    background: 'rgba(255, 110, 102, 0.12)',
  },
}

export default function CritiquePanel({ critique }) {
  if (!critique) {
    return null
  }

  const rating = (critique.confidence?.rating || 'MEDIUM').toUpperCase()
  const chipStyle = CONFIDENCE_STYLES[rating] || CONFIDENCE_STYLES.MEDIUM

  return (
    <section className="panel">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow">Critic Review</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Adversarial findings</h3>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
          style={chipStyle}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: chipStyle.color }}
          />
          Confidence {rating}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(([label, key]) => (
          <article key={key} className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">{label}</h4>
            {critique[key]?.length ? (
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-soft)]">
                {critique[key].map((item) => (
                  <li key={item} className="rounded-2xl border border-white/5 bg-black/10 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)] italic">No items raised.</p>
            )}
          </article>
        ))}
      </div>

      {critique.confidence?.justification ? (
        <div className="mt-5 rounded-3xl border border-white/8 bg-black/10 p-5 text-sm leading-6 text-[var(--text-soft)]">
          <span className="font-semibold text-white">Why this confidence rating?</span>{' '}
          {critique.confidence.justification}
        </div>
      ) : null}
    </section>
  )
}
