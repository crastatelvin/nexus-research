import React from 'react'
import SearchBar from '../components/SearchBar'

const previewCards = [
  {
    title: 'SCOUT',
    description: 'Maps the question into targeted search coverage.',
  },
  {
    title: 'ANALYST',
    description: 'Extracts findings and compares signals across sources.',
  },
  {
    title: 'CRITIC',
    description: 'Flags gaps, bias, overreach, and weak assumptions.',
  },
  {
    title: 'SCRIBE',
    description: 'Turns the workflow into an executive-grade research brief.',
  },
]

export default function LandingPage({ loading, error, onSearch }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16 md:px-10">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="label-eyebrow">Multi-Agent Research Workspace</p>
          <h1 className="mt-6 max-w-4xl font-display text-5xl leading-tight text-white md:text-7xl">
            Watch four agents turn a question into a research brief.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-soft)]">
            NEXUS searches the web, extracts findings, challenges weak logic, and assembles a structured report while the full run stays visible as a live graph.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {previewCards.map((card) => (
              <article key={card.title} className="panel">
                <p className="label-eyebrow">{card.title}</p>
                <p className="mt-4 text-sm leading-6 text-[var(--text-soft)]">{card.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="panel">
            <p className="label-eyebrow">Start a Run</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Choose a question, depth, and mode.</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
              Auto mode uses Groq when configured and drops to deterministic demo mode when no key is present.
            </p>
          </div>
          <SearchBar onSearch={onSearch} loading={loading} />
          {error ? (
            <div
              className="rounded-3xl border px-5 py-4 text-sm"
              style={{
                borderColor: 'rgba(255, 110, 102, 0.35)',
                background: 'rgba(255, 110, 102, 0.1)',
                color: 'var(--critic)',
              }}
            >
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
