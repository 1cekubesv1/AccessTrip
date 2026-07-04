import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppState, StepStatus } from '../../../shared/types'

// A traveler card as rendered by the fleet grid — Camille (live) and the seeded
// fleet both structurally satisfy this shape.
interface FleetDisplay {
  id: string
  name: string
  profileShort: string
  route: string
  dates: string
  steps: StepStatus[]
  confirmations: number
  live?: boolean
}

// Fleet dashboard (Sprint 3): the portfolio of monitored travelers. Camille is the
// live/interactive case (derived from live state); the others illustrate variety.
export default function FleetView({ state }: { state: AppState }) {
  const navigate = useNavigate()

  // Camille's card, live from state
  const camille: FleetDisplay = {
    id: 'camille',
    name: state.traveler.name,
    profileShort: 'Fauteuil électrique · douche italienne',
    route: 'Paris → Nice',
    dates: '12–15 septembre',
    steps: state.trip.steps.map((s) => s.status),
    confirmations: state.ledger.length,
    live: true,
  }
  const travelers = [camille, ...(state.fleet || [])]

  // fleet-level aggregate KPIs
  const totalSteps = travelers.reduce((n, t) => n + t.steps.length, 0)
  const failed = travelers.reduce((n, t) => n + t.steps.filter((s) => s === 'failed').length, 0)
  const atRisk = travelers.reduce((n, t) => n + t.steps.filter((s) => s === 'at_risk').length, 0)
  const completed = travelers.filter((t) => t.steps.every((s) => s === 'done')).length

  const fleetKpis = [
    { label: 'Voyageurs suivis', value: travelers.length, icon: '👥' },
    { label: 'Voyages en cours', value: travelers.length - completed, icon: '🧭' },
    { label: 'Incidents actifs', value: atRisk + failed, icon: '⚠️' },
    { label: 'Étapes garanties', value: `${totalSteps - failed}/${totalSteps}`, icon: '♿' },
  ]

  return (
    <div className="page">
      <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>Flotte de voyageurs</h1>
      <p className="muted" style={{ marginTop: '-0.4rem' }}>
        Chaque trajet est orchestré et surveillé en continu par les agents IA.
      </p>

      <section className="kpi-band" aria-label="Vue d'ensemble de la flotte">
        {fleetKpis.map((k) => (
          <div className="kpi" key={k.label}>
            <span className="kpi-icon" aria-hidden="true">
              {k.icon}
            </span>
            <span className="kpi-value">{k.value}</span>
            <span className="kpi-label">{k.label}</span>
          </div>
        ))}
      </section>

      <div className="fleet-grid">
        {travelers.map((t) => (
          <FleetCard key={t.id} traveler={t} onOpen={() => navigate(`/traveler/${t.id}`)} />
        ))}
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  identified: 'var(--st-identified)',
  contacted: 'var(--st-contacted)',
  confirmed: 'var(--st-confirmed)',
  reconfirmed: 'var(--st-reconfirmed)',
  in_progress: 'var(--st-inprogress)',
  done: 'var(--st-done)',
  at_risk: 'var(--st-atrisk)',
  failed: 'var(--st-failed)',
}

function overall(steps: StepStatus[]): { label: string; cls: string } {
  if (steps.some((s) => s === 'failed')) return { label: 'Incident', cls: 'failed' }
  if (steps.some((s) => s === 'at_risk')) return { label: 'À risque', cls: 'at_risk' }
  if (steps.every((s) => s === 'done')) return { label: 'Terminé', cls: 'done' }
  return { label: 'Sécurisé', cls: 'reconfirmed' }
}

function FleetCard({ traveler, onOpen }: { traveler: FleetDisplay; onOpen: () => void }) {
  const o = overall(traveler.steps)
  return (
    <button
      type="button"
      className="fleet-card"
      onClick={onOpen}
      aria-label={`Ouvrir le voyage de ${traveler.name}`}
    >
      <div className="fleet-card-head">
        <span className="fleet-name">
          {traveler.name}
          {traveler.live && (
            <span className="live-dot" title="En direct" aria-label="en direct">
              {' '}
              ●
            </span>
          )}
        </span>
        <span className="badge" data-status={o.cls}>
          {o.label}
        </span>
      </div>
      <div className="fleet-profile">{traveler.profileShort}</div>
      <div className="fleet-route">
        {traveler.route} · <span className="muted">{traveler.dates}</span>
      </div>
      <div className="fleet-bar" aria-hidden="true">
        {traveler.steps.map((s, i) => (
          <span
            key={i}
            className="fleet-seg"
            style={{ background: STATUS_COLOR[s] || 'var(--line)' }}
          />
        ))}
      </div>
      <div className="fleet-foot muted">
        {traveler.confirmations} confirmation(s) · {traveler.steps.length} étapes
      </div>
    </button>
  )
}
