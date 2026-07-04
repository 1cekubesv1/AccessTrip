import React, { useEffect, useState } from 'react'
import type { ContextResponse } from '../../../shared/types'

// Live real-world context (plugins): real SNCF punctuality for the Paris→Nice
// axis and real Nice weather. Fetched from /api/context; degrades silently.
export default function RealContext() {
  const [ctx, setCtx] = useState<ContextResponse | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/context')
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.ok) setCtx(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!ctx) return null
  const { sncf, weather } = ctx

  return (
    <section className="real-context" aria-label="Contexte réel (données ouvertes)">
      <span className="rc-title">Contexte réel</span>

      {sncf && (
        <span className="rc-item">
          🚆 Axe {sncf.axe} · <strong>{sncf.regularite}%</strong> de régularité
          {sncf.month && <span className="muted"> · {sncf.month}</span>}
          <span className={`rc-badge ${sncf.live ? 'live' : ''}`}>
            {sncf.live ? 'données réelles SNCF' : 'référence'}
          </span>
        </span>
      )}

      {weather && weather.tempC != null && (
        <span className="rc-item">
          🌡️ Nice · <strong>{weather.tempC}°C</strong>, {weather.label}
          <span className="muted"> · vent {weather.windKmh} km/h</span>
          <span className={`rc-badge ${weather.live ? 'live' : ''}`}>{weather.source}</span>
        </span>
      )}
    </section>
  )
}
