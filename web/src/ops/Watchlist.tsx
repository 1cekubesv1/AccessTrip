import React from 'react'
import { StatusBadge } from '../traveler/Timeline'
import type { Step } from '../../../shared/types'

interface WatchlistProps {
  steps: Step[]
}

// Compact operational list of every step with its live status.
export default function Watchlist({ steps }: WatchlistProps) {
  return (
    <section className="panel" aria-labelledby="watch-title">
      <h2 id="watch-title">Surveillance des étapes</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-live="polite">
        {steps.map((s) => (
          <li
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span className="muted" style={{ fontFamily: 'ui-monospace, monospace', minWidth: 28 }}>
              {s.id}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{s.title}</span>
              <br />
              <span className="muted" style={{ fontSize: '0.85rem' }}>
                {s.when} · {s.provider}
              </span>
              {s.reason && (
                <>
                  <br />
                  <span className="reason-chip">⚠ {s.reason}</span>
                </>
              )}
            </span>
            <StatusBadge status={s.status} />
          </li>
        ))}
      </ul>
    </section>
  )
}
