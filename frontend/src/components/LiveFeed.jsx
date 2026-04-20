import React from 'react'
import { useEffect, useRef } from 'react'

export default function LiveFeed({ events }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [events])

  return (
    <section className="panel h-full min-h-[320px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="label-eyebrow">Live Feed</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Run events</h3>
        </div>
        <p className="text-sm text-[var(--muted)]">{events.length} events captured</p>
      </div>

      <div className="scroll-surface h-[240px] space-y-3 overflow-y-auto pr-2">
        {events.length ? (
          events.map((event, index) => (
            <article key={`${event.received_at}-${index}`} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-white">{event.agent}</p>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">{event.status}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{event.message}</p>
            </article>
          ))
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-[var(--muted)]">
            Websocket events will appear here once a run starts.
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  )
}

