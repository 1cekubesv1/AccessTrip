import React from 'react'
import { useParams, Link } from 'react-router-dom'
import TravelerView from './TravelerView'
import { StatusBadge } from './Timeline'
import type { AppState, FleetTraveler } from '../../../shared/types'

// Routes /traveler/:id. Camille is the live interactive case; fleet travelers get
// a read-only detail built from their status array.
export default function TravelerDetail({ state }: { state: AppState }) {
  const { id } = useParams()
  if (!id || id === 'camille') return <TravelerView state={state} />

  const t = (state.fleet || []).find((x) => x.id === id)
  if (!t)
    return (
      <div className="page">
        <p>
          Voyageur introuvable. <Link to="/">Retour à la flotte</Link>
        </p>
      </div>
    )
  return <FleetTravelerDetail traveler={t} />
}

// Generic step template so a fleet traveler's status array reads as a real timeline.
const STEP_TEMPLATE = [
  'Assistance au départ',
  'Trajet principal (place PMR)',
  "Assistance à l'arrivée",
  'Transfert adapté',
  'Hébergement accessible',
  'Restauration accessible',
  'Retour',
]

function FleetTravelerDetail({ traveler }: { traveler: FleetTraveler }) {
  return (
    <div className="page">
      <p className="muted" style={{ marginBottom: '0.3rem' }}>
        <Link to="/">← Flotte</Link>
      </p>
      <div className="phone-wrap">
        <div className="phone">
          <div className="phone-notch" aria-hidden="true" />
          <section className="trip-head">
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Bonjour {traveler.name.split(' ')[0]}
            </p>
            <h2 style={{ margin: '0.25rem 0 0.1rem' }}>
              {traveler.route}, {traveler.dates}
            </h2>
            <p>{traveler.profileShort}</p>
          </section>

          <ol className="timeline" aria-live="off">
            {traveler.steps.map((status, i) => (
              <li key={i}>
                <span
                  className="step-dot"
                  style={{ background: colorFor(status) }}
                  aria-hidden="true"
                />
                <div className="step">
                  <div className="step-summary" style={{ cursor: 'default' }}>
                    <span className="step-body">
                      <span className="step-title">{STEP_TEMPLATE[i] || `Étape ${i + 1}`}</span>
                    </span>
                    <StatusBadge status={status} />
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <section className="panel" style={{ marginTop: '0.9rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Passeport d'accessibilité</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {traveler.needs.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

function colorFor(status: string): string {
  const map: Record<string, string> = {
    identified: 'var(--st-identified)',
    contacted: 'var(--st-contacted)',
    confirmed: 'var(--st-confirmed)',
    reconfirmed: 'var(--st-reconfirmed)',
    in_progress: 'var(--st-inprogress)',
    done: 'var(--st-done)',
    at_risk: 'var(--st-atrisk)',
    failed: 'var(--st-failed)',
  }
  return map[status] || 'var(--line)'
}
