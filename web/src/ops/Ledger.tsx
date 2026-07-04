import React from 'react'
import { Download } from 'lucide-react'
import type { LedgerEntry } from '../../../shared/types'

interface LedgerProps {
  ledger: LedgerEntry[]
}

// Build a semicolon-delimited CSV with a UTF-8 BOM. Semicolons + BOM make Excel
// (esp. French locales) open it with correct columns and accents. Fields with a
// delimiter, quote or newline are quoted and internal quotes doubled (RFC 4180).
function ledgerToCsv(ledger: LedgerEntry[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '')
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ['Étape', 'Confirmé par', 'Canal', 'Quand', 'Référence', 'Notes']
  const rows = ledger.map((e) => [e.step, e.confirmed_by, e.channel, e.at, e.ref, e.notes || ''])
  return '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
}

// The confirmation ledger — the audit trail of who confirmed what, through which
// channel. Exportable to CSV (client-side, no backend) for insurers / agencies.
export default function Ledger({ ledger }: LedgerProps) {
  function exportCsv() {
    const blob = new Blob([ledgerToCsv(ledger)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accesstrip-registre-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel" aria-labelledby="ledger-title">
      <div className="panel-head">
        <h2 id="ledger-title" style={{ margin: 0 }}>
          Registre des confirmations
        </h2>
        <button
          type="button"
          className="csv-btn"
          onClick={exportCsv}
          disabled={ledger.length === 0}
          aria-label="Exporter le registre en CSV"
        >
          <Download size={15} aria-hidden="true" /> Exporter CSV
        </button>
      </div>
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
