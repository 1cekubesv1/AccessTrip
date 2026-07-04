import React from 'react'
import { Printer } from 'lucide-react'
import { StatusBadge } from './Timeline'
import { ssrForCategory, STANDARDS } from '../../../shared/reference'
import type { AppState } from '../../../shared/types'

// Printable, audit-grade trip report (exportable for insurers / travel agencies).
// On screen it renders as a document "sheet"; on print (window.print / Save as PDF)
// the app chrome drops away and it paginates cleanly — see @media print in styles.css.
export default function TripReport({ state }: { state: AppState }) {
  const t = state.traveler
  const { steps, label } = state.trip
  const ledger = state.ledger
  const m = state.metrics
  const eq = t.equipment
  const ssr = ssrForCategory('Moteur')
  const accessibleHeld = steps.filter((s) => s.status !== 'failed').length
  const incidents = (state.disruptions || []).length

  const now = new Date()
  const generated = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const pad = (n: number) => String(n).padStart(2, '0')
  const reportRef = `AT-${now.getFullYear()}-${pad(now.getMonth() + 1)}${pad(now.getDate())}-CAM`

  return (
    <div className="page report-page">
      <div className="report-toolbar no-print">
        <div>
          <h1>Rapport de voyage</h1>
          <p className="muted" style={{ margin: '0.2rem 0 0' }}>
            Document d'audit accessibilité — exportable pour l'assureur ou l'agence.
          </p>
        </div>
        <button type="button" className="primary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Imprimer / Exporter en PDF
        </button>
      </div>

      <article className="report-sheet" aria-label="Rapport de voyage">
        <header className="report-head">
          <div>
            <div className="report-wordmark">
              Access<span className="dot">Trip</span>
            </div>
            <h2 className="report-title">{label}</h2>
          </div>
          <div className="report-meta">
            <div>
              Voyageur·euse : <strong>{t.name}</strong>
            </div>
            <div>
              Généré le <strong>{generated}</strong>
            </div>
            <div>
              Réf. <strong>{reportRef}</strong>
            </div>
          </div>
        </header>

        <section className="report-section">
          <h2>Voyageur·euse &amp; passeport d'accessibilité</h2>
          <dl className="report-kv">
            <div>
              <dt>Âge</dt>
              <dd>{t.age} ans</dd>
            </div>
            <div>
              <dt>Langue</dt>
              <dd>{t.lang}</dd>
            </div>
            <div>
              <dt>Équipement</dt>
              <dd>
                {eq.type} — {eq.model}
              </dd>
            </div>
            <div>
              <dt>Poids / dim.</dt>
              <dd>
                {eq.weight_kg} kg · {eq.dimensions_cm.l}×{eq.dimensions_cm.w}×{eq.dimensions_cm.h}{' '}
                cm
              </dd>
            </div>
            <div>
              <dt>Batterie</dt>
              <dd>{eq.battery}</dd>
            </div>
            <div>
              <dt>Aidant·e</dt>
              <dd>
                {t.caregiver.name} ({t.caregiver.relation}, {t.caregiver.access})
              </dd>
            </div>
            <div>
              <dt>Contact urgence</dt>
              <dd>{t.emergency_contact}</dd>
            </div>
          </dl>
          <p className="muted" style={{ margin: '0.9rem 0 0.3rem', fontSize: '0.82rem' }}>
            Besoins fonctionnels
          </p>
          <ul className="report-needs">
            {t.profile_functional_needs.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <div className="report-ssr">
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              Codes IATA
            </span>
            {ssr.map((s) => (
              <span key={s.code} className="ssr-chip" title={s.label}>
                {s.code}
              </span>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2>Étapes du voyage</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Étape</th>
                <th scope="col">Horaire · prestataire</th>
                <th scope="col">Référence</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.title}
                    {s.reason && (
                      <div className="muted" style={{ fontSize: '0.82rem' }}>
                        ⚠ {s.reason}
                      </div>
                    )}
                  </td>
                  <td>
                    {s.when} · {s.provider}
                  </td>
                  <td className="ref">{s.ref}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <h2>Registre des confirmations</h2>
          {ledger.length === 0 ? (
            <p className="muted">Aucune confirmation enregistrée.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Étape</th>
                  <th scope="col">Confirmé par</th>
                  <th scope="col">Canal</th>
                  <th scope="col">Quand</th>
                  <th scope="col">Réf.</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, i) => (
                  <tr key={i}>
                    <td className="ref">{e.step}</td>
                    <td>
                      {e.confirmed_by}
                      {e.notes && (
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {e.notes}
                        </div>
                      )}
                    </td>
                    <td>{e.channel}</td>
                    <td>{e.at}</td>
                    <td className="ref">{e.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="report-section">
          <h2>Impact de l'orchestration</h2>
          <div className="report-impact">
            <div className="report-stat">
              <b>{incidents}</b>
              <span>Incidents interceptés</span>
            </div>
            <div className="report-stat">
              <b>{m.interventions || 0}</b>
              <span>Remédiations appliquées</span>
            </div>
            <div className="report-stat">
              <b>{m.minutesRecovered || 0} min</b>
              <span>Minutes récupérées</span>
            </div>
            <div className="report-stat">
              <b>
                {accessibleHeld}/{steps.length}
              </b>
              <span>Accessibilité tenue</span>
            </div>
          </div>
        </section>

        <section className="report-section">
          <h2>Conformité réglementaire</h2>
          <div className="report-standards">
            {STANDARDS.map((s) => (
              <div key={s.ref}>
                <strong>{s.ref}</strong> — {s.title}
              </div>
            ))}
          </div>
        </section>

        <footer className="report-foot">
          <span>AccessTrip — orchestration de voyage accessible</span>
          <span>
            {reportRef} · généré le {generated}
          </span>
        </footer>
      </article>
    </div>
  )
}
