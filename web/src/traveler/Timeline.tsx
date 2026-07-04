import React from 'react'
import type { Step, LedgerEntry } from '../../../shared/types'

const STATUS_LABEL: Record<string, string> = {
  identified: 'Identifié',
  contacted: 'Contacté',
  confirmed: 'Confirmé',
  reconfirmed: 'Re-confirmé',
  in_progress: 'En cours',
  done: 'Terminé',
  at_risk: 'À risque',
  failed: 'Échec',
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

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="badge" data-status={status}>
      {STATUS_LABEL[status] || status}
    </span>
  )
}

interface TimelineProps {
  steps: Step[]
  ledger?: LedgerEntry[]
}

// Vertical pipeline of trip steps. Each step is a keyboard-operable <details> that
// expands to its ledger receipts. aria-live announces status changes politely.
export default function Timeline({ steps, ledger = [] }: TimelineProps) {
  const receiptsFor = (stepId: string) => ledger.filter((e) => e.step === stepId)

  return (
    <section aria-labelledby="timeline-title">
      <h3 id="timeline-title" className="sr-only">
        Étapes du voyage
      </h3>
      <ol className="timeline" aria-live="polite">
        {steps.map((step) => {
          const receipts = receiptsFor(step.id)
          return (
            <li key={step.id}>
              <span
                className="step-dot"
                style={{ background: STATUS_COLOR[step.status] || 'var(--line)' }}
                aria-hidden="true"
              />
              <details className="step">
                <summary className="step-summary">
                  <span className="step-body">
                    <span className="step-title">{step.title}</span>
                    <span className="step-meta">
                      {step.when} · {step.provider}
                      {receipts.length > 0 && (
                        <>
                          {' '}
                          · <span className="muted">{receipts.length} reçu(s)</span>
                        </>
                      )}
                    </span>
                    {step.reason && (
                      <span className="reason-chip" style={{ marginTop: '0.35rem' }}>
                        ⚠ {step.reason}
                      </span>
                    )}
                  </span>
                  <StatusBadge status={step.status} />
                </summary>
                <div className="step-receipts">
                  <p className="muted" style={{ margin: '0 0 0.4rem' }}>
                    Référence : <span className="ref">{step.ref}</span>
                    {step.reconfirm_due && (
                      <>
                        {' '}
                        · <strong>re-confirmation due</strong>
                      </>
                    )}
                  </p>
                  {receipts.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>
                      Aucun reçu enregistré pour l'instant.
                    </p>
                  ) : (
                    receipts.map((r, i) => (
                      <div className="receipt" key={i}>
                        <div>
                          Confirmé par <strong>{r.confirmed_by}</strong>{' '}
                          <span className="muted">
                            ({r.channel}, {r.at})
                          </span>
                        </div>
                        <div className="ref">{r.ref}</div>
                        {r.notes && <div className="muted">{r.notes}</div>}
                      </div>
                    ))
                  )}
                </div>
              </details>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
