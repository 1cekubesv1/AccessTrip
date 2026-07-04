import React from 'react'
import type { LedgerEntry } from '../../../shared/types'

interface LedgerProps {
  ledger: LedgerEntry[]
}

// The confirmation ledger — the audit trail of who confirmed what, through which channel.
export default function Ledger({ ledger }: LedgerProps) {
  return (
    <section className="panel" aria-labelledby="ledger-title">
      <h2 id="ledger-title">Registre des confirmations</h2>
      {ledger.length === 0 ? (
        <p className="muted">Aucune confirmation enregistrée.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger-table">
            <caption className="sr-only">Registre des confirmations d'accessibilité</caption>
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
                  <td style={{ fontFamily: 'ui-monospace, monospace' }}>{e.step}</td>
                  <td>
                    {e.confirmed_by}
                    {e.notes && <div className="muted">{e.notes}</div>}
                  </td>
                  <td>{e.channel}</td>
                  <td>{e.at}</td>
                  <td className="ref">{e.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
