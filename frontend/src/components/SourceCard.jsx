import React from 'react'

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return null
  }
}

export default function SourceCard({ source, index }) {
  const domain = getDomain(source.url)
  const favicon = getFavicon(source.url)

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col rounded-3xl border border-white/8 bg-white/4 p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/6 hover:shadow-[0_18px_40px_rgba(5,10,20,0.45)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {favicon ? (
            <img
              src={favicon}
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 rounded-sm bg-white/10"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
          <span className="truncate text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent-soft)]">
            {domain}
          </span>
        </div>
        {typeof index === 'number' ? (
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {String(index + 1).padStart(2, '0')}
          </span>
        ) : null}
      </div>

      <h3 className="text-base font-semibold leading-6 text-white transition group-hover:text-[var(--accent)]">
        {source.title}
      </h3>

      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--text-soft)]">
        {source.snippet || 'No snippet available.'}
      </p>

      <p
        className="mt-4 flex items-center gap-1.5 text-xs text-[var(--muted)] transition group-hover:text-[var(--accent-soft)]"
        title={source.url}
      >
        <span className="truncate">{source.url}</span>
        <span aria-hidden="true" className="shrink-0">→</span>
      </p>
    </a>
  )
}

