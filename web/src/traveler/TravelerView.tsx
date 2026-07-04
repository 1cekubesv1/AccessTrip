import React from 'react'
import Timeline from './Timeline'
import Passport from './Passport'
import type { AppState } from '../../../shared/types'

// Traveler-facing screen, laid out inside a phone frame.
export default function TravelerView({ state }: { state: AppState }) {
  return (
    <div className="page">
      <div className="phone-wrap">
        <div className="phone">
          <div className="phone-notch" aria-hidden="true" />
          <section aria-labelledby="trip-title" className="trip-head">
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Bonjour {state.traveler.name.split(' ')[0]}
            </p>
            <h2 id="trip-title">{state.trip.label}</h2>
            <p>Votre voyage, orchestré et surveillé en continu.</p>
          </section>
          <Timeline steps={state.trip.steps} ledger={state.ledger} />
          <Passport traveler={state.traveler} />
        </div>
      </div>
    </div>
  )
}
