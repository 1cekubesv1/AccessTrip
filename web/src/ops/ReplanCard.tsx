import React, { useState } from 'react'
import type { ReplanPlan } from '../../../shared/types'

interface ReplanCardProps {
  replan: ReplanPlan | null
  onApplied?: () => void | Promise<unknown>
}

// Renders the planner's proposed remediation plan as a card with an Apply action.
// aria-live so VoiceOver announces the plan the moment it appears.
export default function ReplanCard({ replan, onApplied }: ReplanCardProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function apply() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/replan/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (onApplied) await onApplied()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="panel"
      aria-labelledby="replan-title"
      aria-live="polite"
      style={{ borderColor: 'var(--st-atrisk)' }}
    >
      <h2 id="replan-title">Plan de remédiation proposé</h2>
      {!replan ? (
        <p className="muted">Aucune remédiation en attente. Le voyage est stable.</p>
      ) : (
        <>
          {replan.message_voyageur && (
            <p style={{ marginTop: 0, fontStyle: 'italic' }}>« {replan.message_voyageur} »</p>
          )}
          <ol style={{ margin: '0 0 0.8rem', paddingLeft: '1.2rem' }}>
            {replan.plan.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <strong>{item.stepId}</strong> — {item.action}
                {item.new_time && (
                  <>
                    {' '}
                    · <span className="ref">{item.new_time}</span>
                  </>
                )}
                <br />
                <span className="muted" style={{ fontSize: '0.88rem' }}>
                  {item.rationale}
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className="primary" onClick={apply} disabled={busy}>
            {busy ? 'Application…' : '✓ Appliquer le plan'}
          </button>
          {error && (
            <p style={{ color: 'var(--st-failed)' }} role="alert">
              Échec : {error}
            </p>
          )}
        </>
      )}
    </section>
  )
}
