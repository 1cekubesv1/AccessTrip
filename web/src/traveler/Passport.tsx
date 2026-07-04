import React from 'react'
import type { Traveler } from '../../../shared/types'

// Accessibility passport: the traveler's functional needs + equipment, always visible.
export default function Passport({ traveler }: { traveler: Traveler }) {
  const eq = traveler.equipment
  return (
    <section aria-labelledby="passport-title" className="panel" style={{ marginTop: '0.9rem' }}>
      <h3 id="passport-title" style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
        Passeport d'accessibilité
      </h3>
      <ul style={{ margin: '0 0 0.6rem', paddingLeft: '1.1rem' }}>
        {traveler.profile_functional_needs.map((need, i) => (
          <li key={i}>{need}</li>
        ))}
      </ul>
      <dl style={{ margin: 0, fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt className="muted" style={{ minWidth: 92 }}>
            Équipement
          </dt>
          <dd style={{ margin: 0 }}>
            {eq.type} — {eq.model}
          </dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt className="muted" style={{ minWidth: 92 }}>
            Poids
          </dt>
          <dd style={{ margin: 0 }}>
            {eq.weight_kg} kg · {eq.dimensions_cm.l}×{eq.dimensions_cm.w}×{eq.dimensions_cm.h} cm
          </dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt className="muted" style={{ minWidth: 92 }}>
            Batterie
          </dt>
          <dd style={{ margin: 0 }}>{eq.battery}</dd>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <dt className="muted" style={{ minWidth: 92 }}>
            Aidant
          </dt>
          <dd style={{ margin: 0 }}>
            {traveler.caregiver.name} ({traveler.caregiver.relation}, {traveler.caregiver.access})
          </dd>
        </div>
      </dl>
    </section>
  )
}
