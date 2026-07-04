import React, { useState } from 'react'
import type { AppState, Step } from '../../../shared/types'

type PostBodyFn = (url: string, body: unknown, label: string) => Promise<void>

interface DemoPanelProps {
  state: AppState
  reload: () => Promise<AppState>
}

// Presenter's control panel. M1: Reset. Later milestones add Chaos, Start-call,
// force-step overrides (M6 "invisible insurance").
export default function DemoPanel({ state, reload }: DemoPanelProps) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function post(url: string, label: string) {
    return postBody(url, undefined, label)
  }

  const postBody: PostBodyFn = async (url, body, label) => {
    setBusy(true)
    setStatus(`${label}…`)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await reload()
      setStatus(`${label} : OK`)
    } catch (err) {
      setStatus(`${label} : échec (${err.message})`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <h1 style={{ marginTop: 0, fontSize: '1.4rem' }}>Panneau de démo</h1>
      <p className="muted" style={{ marginTop: '-0.4rem' }}>
        Contrôles du présentateur. Tout peut être réinitialisé en un clic.
      </p>

      <section className="panel" aria-labelledby="guided-title" style={{ marginBottom: '1rem' }}>
        <h2 id="guided-title">▶ Démo guidée</h2>
        <p className="muted" style={{ marginTop: '-0.3rem' }}>
          Déroulé automatique et narré des trois flux (perturbation, appel IA, vision). Idéal pour
          la scène.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => window.dispatchEvent(new CustomEvent('guided-demo-start'))}
        >
          ▶ Lancer la démo guidée
        </button>
      </section>

      <section className="panel" aria-labelledby="demo-controls-title">
        <h2 id="demo-controls-title">Contrôles manuels</h2>
        <div className="demo-actions">
          <button
            type="button"
            className="danger"
            onClick={() => post('/api/demo/reset', 'Réinitialisation')}
            disabled={busy}
          >
            ↺ Réinitialiser la démo
          </button>

          <button
            type="button"
            onClick={() =>
              postBody('/api/call/start', { branch: 'B2' }, 'Appel IA (chambre indisponible)')
            }
            disabled={busy}
          >
            📞 Lancer l'appel IA — scénario scène
          </button>
          <button
            type="button"
            onClick={() => postBody('/api/call/start', { branch: 'B1' }, 'Appel IA (confirmation)')}
            disabled={busy}
          >
            📞 Appel IA — confirmation OK
          </button>
        </div>

        <p className="demo-status" role="status" aria-live="polite">
          {status}
        </p>

        <p className="demo-note">
          État actuel : {state.trip.steps.length} étapes · {state.ledger.length} confirmation(s) au
          registre · {state.agentLog.length} ligne(s) de journal.
        </p>
      </section>

      <section className="panel" aria-labelledby="scenarios-title" style={{ marginTop: '1rem' }}>
        <h2 id="scenarios-title">⚡ Perturbations</h2>
        <p className="muted" style={{ marginTop: '-0.3rem' }}>
          Injectez un incident — le watchdog détecte, le planificateur remédie, chaque type a sa
          cascade.
        </p>
        <div className="demo-actions">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => postBody('/api/demo/chaos', { scenarioId: sc.id }, sc.label)}
              disabled={busy}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </section>

      <ForceControls steps={state.trip.steps} postBody={postBody} busy={busy} />
    </div>
  )
}

// mirrors server/scenarios.js
const SCENARIOS = [
  { id: 'tgv-delay', label: 'Retard TGV (55 min)' },
  { id: 'strike', label: 'Grève SNCF (train supprimé)' },
  { id: 'elevator', label: 'Ascenseur PMR en panne' },
  { id: 'weather', label: 'Alerte météo (orage)' },
  { id: 'taxi-cancel', label: 'Taxi adapté annulé' },
]

const STATUSES = [
  'identified',
  'contacted',
  'confirmed',
  'reconfirmed',
  'in_progress',
  'done',
  'at_risk',
  'failed',
]

// M6 "invisible insurance": force any step to any status manually if a live
// event fails on stage.
function ForceControls({
  steps,
  postBody,
  busy,
}: {
  steps: Step[]
  postBody: PostBodyFn
  busy: boolean
}) {
  const [stepId, setStepId] = useState(steps[0]?.id || 's1')
  const [status, setStatus] = useState('at_risk')
  const [reason, setReason] = useState('')

  return (
    <section
      className="panel"
      aria-labelledby="force-title"
      style={{ marginTop: '1rem', borderStyle: 'dashed' }}
    >
      <h2 id="force-title">Contrôles de secours</h2>
      <p className="muted" style={{ marginTop: '-0.3rem' }}>
        Forçage manuel d'une étape — assurance invisible si un événement échoue en direct.
      </p>
      <div className="demo-actions" style={{ alignItems: 'flex-end' }}>
        <label>
          Étape
          <br />
          <select value={stepId} onChange={(e) => setStepId(e.target.value)} disabled={busy}>
            {steps.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.title.slice(0, 28)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Statut
          <br />
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
        <label>
          Motif (optionnel)
          <br />
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            placeholder="ex. TGV retardé"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            postBody(
              '/api/demo/force-step',
              { stepId, status, reason: reason || null },
              `Forçage ${stepId} → ${status}`,
            )
          }
          disabled={busy}
        >
          Forcer
        </button>
      </div>
    </section>
  )
}
