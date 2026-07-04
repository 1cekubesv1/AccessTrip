import React, { useState } from 'react'
import type { VisionVerdict } from '../../../shared/types'

interface VisionCheckProps {
  verdict: VisionVerdict | null
}

// Vision check + autofill launcher (M5). Upload a photo → accessibility verdict
// card; or launch the headed Playwright autofill on the replica PRM form.
export default function VisionCheck({ verdict }: VisionCheckProps) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setBusy(true)
    setNote('Analyse de la photo…')
    try {
      let body: Record<string, unknown> = {}
      if (file) {
        const base64 = await readAsBase64(file)
        body = { base64, mediaType: file.type || 'image/jpeg' }
      }
      const res = await fetch('/api/vision/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setNote('Verdict rendu.')
    } catch (err) {
      setNote(`Échec : ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function runAutofill() {
    setBusy(true)
    setNote('Lancement du remplissage automatique (fenêtre navigateur)…')
    try {
      const res = await fetch('/api/autofill/run', { method: 'POST' })
      const data = await res.json()
      setNote(data.ok ? 'Formulaire PMR rempli.' : `Autofill indisponible : ${data.error}`)
    } catch (err) {
      setNote(`Échec : ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="vision-title">
      <h2 id="vision-title">Vérification visuelle & auto-remplissage</h2>

      <div className="demo-actions" style={{ marginBottom: '0.6rem' }}>
        <label className="file-btn">
          🖼️ Analyser une photo
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} hidden />
        </label>
        <button type="button" onClick={runAutofill} disabled={busy}>
          📝 Remplir le formulaire PMR
        </button>
      </div>
      <p
        className="muted"
        role="status"
        aria-live="polite"
        style={{ minHeight: '1.2rem', margin: '0 0 0.6rem' }}
      >
        {note}
      </p>

      {verdict && (
        <div className="verdict" data-conforme={verdict.conforme} aria-live="polite">
          <div className="verdict-head">
            <span className="verdict-flag">
              {verdict.conforme ? '✓ Conforme' : '✗ Non conforme'}
            </span>
            <span className="muted">confiance {Math.round((verdict.confiance || 0) * 100)}%</span>
          </div>
          <div className="verdict-crit">
            <strong>{verdict.critere}</strong>
          </div>
          <blockquote className="verdict-quote">« {verdict.preuve} »</blockquote>
          <p style={{ margin: 0 }}>{verdict.recommandation}</p>
          {verdict.source && (
            <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.4rem' }}>
              Source : {verdict.source}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
