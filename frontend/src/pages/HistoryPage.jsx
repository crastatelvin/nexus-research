import React from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'

export default function HistoryPage({ runs, loading, error, onSearch }) {
  const navigate = useNavigate()

  const handleClick = (run) => {
    navigate('/research', { state: { runId: run.run_id, question: run.question } })
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10">
      <div className="mb-8">
        <p className="label-eyebrow">Run History</p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Recent Research</h1>
      </div>

      <section className="mb-8">
        <SearchBar onSearch={onSearch} loading={loading} />
      </section>

      {error && (
        <div className="mb-4 rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: 'rgba(255,110,102,0.35)', background: 'rgba(255,110,102,0.1)', color: 'var(--critic)' }}>
          {error}
        </div>
      )}

      {runs.length === 0 && !loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center text-[var(--text-soft)]">
          <p>No research runs yet. Start one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <article
              key={run.run_id}
              onClick={() => handleClick(run)}
              className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:bg-white/8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{run.question}</p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {run.created_at?.slice(0, 10)} · {run.depth} · {run.mode}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  run.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                  run.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {run.status}
                </span>
              </div>
              {run.result?.report?.executive_summary && (
                <p className="mt-2 line-clamp-2 text-xs text-[var(--text-soft)]">
                  {run.result.report.executive_summary}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
