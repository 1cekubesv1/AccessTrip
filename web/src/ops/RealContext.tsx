import React, { useEffect, useState } from 'react'
import {
  TrainFront,
  Train,
  Accessibility,
  Hotel,
  Thermometer,
  Check,
  Landmark,
  Route,
} from 'lucide-react'
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
  const { sncf, weather, assistance, osm, navitia, acceslibre, route } = ctx

  return (
    <section className="real-context" aria-label="Contexte réel (données ouvertes)">
      <span className="rc-title">Contexte réel</span>

      {navitia && navitia.live && (
        <span className="rc-item">
          <TrainFront size={15} className="rc-icon" aria-hidden="true" /> Trajet Paris→Nice ·{' '}
          <strong>{navitia.durationMin} min</strong>
          <span className="muted"> · {navitia.disruptions} perturbation(s)</span>
          <span className="rc-badge live">{navitia.source} temps réel</span>
        </span>
      )}

      {sncf && (
        <span className="rc-item">
          <Train size={15} className="rc-icon" aria-hidden="true" /> Axe {sncf.axe} ·{' '}
          <strong>{sncf.regularite}%</strong> de régularité
          {sncf.month && <span className="muted"> · {sncf.month}</span>}
          <span className={`rc-badge ${sncf.live ? 'live' : ''}`}>
            {sncf.live ? 'données réelles SNCF' : 'référence'}
          </span>
        </span>
      )}

      {assistance && (
        <span className="rc-item">
          <Accessibility size={15} className="rc-icon" aria-hidden="true" /> Assistance{' '}
          {assistance.gare} · <strong>{assistance.gratuit ? 'gratuite' : 'payante'}</strong>
          <span className="muted"> · {assistance.priseEnCharge?.toLowerCase()}</span>
          <span className={`rc-badge ${assistance.live ? 'live' : ''}`}>
            {assistance.live ? 'données réelles SNCF' : 'référence'}
          </span>
        </span>
      )}

      {osm && osm.count != null && (
        <span className="rc-item">
          <Hotel size={15} className="rc-icon" aria-hidden="true" /> <strong>{osm.count}</strong>{' '}
          lieux accessibles à Nice
          {osm.beauRivage && (
            <span className="muted">
              {' '}
              · Beau Rivage vérifié <Check size={13} className="rc-icon" aria-hidden="true" />
            </span>
          )}
          <span className={`rc-badge ${osm.live ? 'live' : ''}`}>{osm.source}</span>
        </span>
      )}

      {acceslibre && (
        <span className="rc-item">
          <Landmark size={15} className="rc-icon" aria-hidden="true" /> Accessibilité{' '}
          {acceslibre.commune}
          {acceslibre.count != null ? (
            <>
              {' '}
              · <strong>{acceslibre.count}</strong> ERP référencés
              {acceslibre.accessible != null && (
                <span className="muted"> · {acceslibre.accessible} de plain-pied</span>
              )}
            </>
          ) : (
            <span className="muted"> · {acceslibre.sample.join(', ')}</span>
          )}
          <span className={`rc-badge ${acceslibre.live ? 'live' : ''}`}>{acceslibre.source}</span>
        </span>
      )}

      {route && (route.distanceM != null || !route.live) && (
        <span className="rc-item">
          <Route size={15} className="rc-icon" aria-hidden="true" /> Itinéraire fauteuil{' '}
          {route.from} → {route.to}
          {route.distanceM != null && (
            <>
              {' '}
              · <strong>{(route.distanceM / 1000).toFixed(1)} km</strong>
            </>
          )}
          {route.stairsFree && <span className="muted"> · sans escalier</span>}
          <span className={`rc-badge ${route.live ? 'live' : ''}`}>{route.source}</span>
        </span>
      )}

      {weather && weather.tempC != null && (
        <span className="rc-item">
          <Thermometer size={15} className="rc-icon" aria-hidden="true" /> Nice ·{' '}
          <strong>{weather.tempC}°C</strong>, {weather.label}
          <span className="muted"> · vent {weather.windKmh} km/h</span>
          <span className={`rc-badge ${weather.live ? 'live' : ''}`}>{weather.source}</span>
        </span>
      )}
    </section>
  )
}
