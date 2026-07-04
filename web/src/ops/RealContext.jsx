import React, { useEffect, useState } from 'react'

// Live real-world context (plugins): real SNCF punctuality for the Paris→Nice
// axis and real Nice weather. Fetched from /api/context; degrades silently.
export default function RealContext() {
  const [ctx, setCtx] = useState(null)

  useEffect(() => {
    let alive = true
    fetch('/api/context').then((r) => r.json()).then((d) => { if (alive && d.ok) setCtx(d) }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!ctx) return null
  const { sncf, weather, assistance, osm, navitia } = ctx

  return (
    <section className="real-context" aria-label="Contexte réel (données ouvertes)">
      <span className="rc-title">Contexte réel</span>

      {navitia && navitia.live && (
        <span className="rc-item">
          🚄 Trajet Paris→Nice · <strong>{navitia.durationMin} min</strong>
          <span className="muted"> · {navitia.disruptions} perturbation(s)</span>
          <span className="rc-badge live">{navitia.source} temps réel</span>
        </span>
      )}

      {sncf && (
        <span className="rc-item">
          🚆 Axe {sncf.axe} · <strong>{sncf.regularite}%</strong> de régularité
          {sncf.month && <span className="muted"> · {sncf.month}</span>}
          <span className={`rc-badge ${sncf.live ? 'live' : ''}`}>{sncf.live ? 'données réelles SNCF' : 'référence'}</span>
        </span>
      )}

      {assistance && (
        <span className="rc-item">
          ♿ Assistance {assistance.gare} · <strong>{assistance.gratuit ? 'gratuite' : 'payante'}</strong>
          <span className="muted"> · {assistance.priseEnCharge?.toLowerCase()}</span>
          <span className={`rc-badge ${assistance.live ? 'live' : ''}`}>{assistance.live ? 'données réelles SNCF' : 'référence'}</span>
        </span>
      )}

      {osm && osm.count != null && (
        <span className="rc-item">
          🏨 <strong>{osm.count}</strong> lieux accessibles à Nice
          {osm.beauRivage && <span className="muted"> · Beau Rivage vérifié ✓</span>}
          <span className={`rc-badge ${osm.live ? 'live' : ''}`}>{osm.source}</span>
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
