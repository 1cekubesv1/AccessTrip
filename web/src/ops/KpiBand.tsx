import React, { useEffect, useRef, useState } from 'react'
import type { AppState } from '../../../shared/types'

interface KpiBandProps {
  state: AppState
}

// Impact metrics band (Sprint 1). Quantifies what the orchestration achieved:
// incidents caught, interventions applied, minutes recovered, accessibility held.
export default function KpiBand({ state }: KpiBandProps) {
  const steps = state.trip.steps
  const m = state.metrics
  const accessibleHeld = steps.filter((s) => s.status !== 'failed').length

  const kpis = [
    {
      key: 'incidents',
      label: 'Incidents interceptés',
      value: (state.disruptions || []).length,
      icon: '🛡️',
    },
    {
      key: 'interventions',
      label: 'Remédiations appliquées',
      value: m.interventions || 0,
      icon: '⚙️',
    },
    {
      key: 'minutes',
      label: 'Minutes récupérées',
      value: m.minutesRecovered || 0,
      icon: '⏱️',
      suffix: ' min',
    },
    { key: 'calls', label: 'Appels IA passés', value: m.callsMade || 0, icon: '📞' },
    {
      key: 'access',
      label: 'Accessibilité tenue',
      value: accessibleHeld,
      suffix: `/${steps.length}`,
      icon: '♿',
    },
  ]

  return (
    <section className="kpi-band" aria-label="Métriques d'impact">
      {kpis.map((k) => (
        <div className="kpi" key={k.key}>
          <span className="kpi-icon" aria-hidden="true">
            {k.icon}
          </span>
          <Kpi value={k.value} suffix={k.suffix} />
          <span className="kpi-label">{k.label}</span>
        </div>
      ))}
    </section>
  )
}

// Renders the value and re-triggers a brief pulse animation whenever it changes.
function Kpi({ value, suffix }: { value: number | string; suffix?: string }) {
  const [pulse, setPulse] = useState(0)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      setPulse((p) => p + 1)
    }
  }, [value])
  return (
    <span className="kpi-value" key={pulse} data-pulse={pulse}>
      {value}
      {suffix || ''}
    </span>
  )
}
