import React from 'react'
import { motion } from 'framer-motion'

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

  // Calculate estimated read time
  const wordCount = (source.snippet || '').split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <motion.a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-5 transition-all hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-[var(--accent-primary)]/10"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {favicon && (
            <img
              src={favicon}
              alt=""
              width={16}
              height={16}
              className="flex-shrink-0 rounded bg-white/10"
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <span className="truncate text-xs font-mono uppercase tracking-widest text-[var(--accent-soft)]">
            {domain}
          </span>
        </div>
        <span className="flex-shrink-0 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-glass)] px-2 py-1 rounded-full border border-[var(--border-subtle)]">
          #{String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug text-white mb-3 line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
        {source.title}
      </h3>

      {/* Snippet */}
      <p className="text-sm leading-relaxed text-[var(--text-soft)] line-clamp-3 mb-4">
        {source.snippet || 'No snippet available.'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ~{readTime} min read
        </span>
        <span className="text-xs text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          Visit source
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </span>
      </div>
    </motion.a>
  )
}
