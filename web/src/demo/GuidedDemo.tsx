import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppState } from '../../../shared/types'

interface GuidedDemoProps {
  reload?: () => Promise<AppState>
}

// Guided demo (Sprint 4): an auto-play, narrated run of the three flows. Launched
// via a `guided-demo-start` window event (from the demo panel). Robust: it polls
// server state for readiness instead of guessing fixed delays.
export default function GuidedDemo({ reload }: GuidedDemoProps) {
  const [running, setRunning] = useState(false)
  const [caption, setCaption] = useState('')
  const [progress, setProgress] = useState(0)
  const abortRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onStart = () => {
      if (!running) run()
    }
    window.addEventListener('guided-demo-start', onStart)
    return () => window.removeEventListener('guided-demo-start', onStart)
  }) // re-bind each render so `running` is fresh

  async function run() {
    abortRef.current = false
    setRunning(true)
    setProgress(0)
    try {
      await post('/api/demo/reset')
      navigate('/ops')
      await say('Voyage de Camille : tout est sécurisé. Lançons la surveillance.', 1800, 5)

      // Flow A — disruption + replan
      await say("⚡ Une grève SNCF supprime le train. Les agents détectent l'impact…", 600, 15)
      await post('/api/demo/chaos', { scenarioId: 'strike' })
      await waitForReplan()
      await say("🧭 Plan de remédiation calculé, sans compromis d'accessibilité.", 1600, 35)
      await post('/api/replan/apply')
      await reload?.()
      await say('✓ Report sur le TGV suivant, tout repasse au vert.', 1600, 45)

      // Flow B — live call + recovery
      await say("📞 Re-confirmation de l'hôtel par appel IA (voix en direct)…", 600, 55)
      await post('/api/call/start', { branch: 'B2' })
      await waitForCallEnd()
      await say("🧾 L'extracteur détecte : chambre perdue. Récupération automatique…", 800, 72)
      await waitForReplan()
      await post('/api/replan/apply')
      await reload?.()
      await say('✓ Hôtel Aston sécurisé, taxi re-routé. Zéro action pour Camille.', 1600, 85)

      // Flow C — vision
      await say("👁️ Vérification visuelle de la conformité d'une salle de bain…", 600, 92)
      await post('/api/vision/check', {})
      await say('Verdict rendu : ressaut détecté, non conforme, signalé.', 1800, 98)

      await say("Voyage entièrement orchestré. Zéro compromis d'accessibilité.", 2600, 100)
    } catch {
      /* aborted */
    } finally {
      stop()
    }
  }

  function stop() {
    abortRef.current = true
    setRunning(false)
    setCaption('')
    setProgress(0)
  }

  // helpers -----------------------------------------------------------------
  async function say(text: string, holdMs: number, pct?: number) {
    if (abortRef.current) throw new Error('abort')
    setCaption(text)
    if (typeof pct === 'number') setProgress(pct)
    await delay(holdMs)
  }
  async function post(url: string, body?: unknown) {
    if (abortRef.current) throw new Error('abort')
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }
  async function waitForReplan() {
    for (let i = 0; i < 30 && !abortRef.current; i++) {
      const s = await (await fetch('/api/state')).json()
      if (s.replan) {
        await reload?.()
        return
      }
      await delay(400)
    }
  }
  async function waitForCallEnd() {
    for (let i = 0; i < 40 && !abortRef.current; i++) {
      const s = await (await fetch('/api/state')).json()
      if (['ended', 'extracted'].includes(s.call?.status)) return
      await delay(400)
    }
  }

  if (!running) return null
  return (
    <div className="guided-bar" role="status" aria-live="polite">
      <div className="guided-track">
        <div className="guided-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="guided-row">
        <span className="guided-badge">Démo guidée</span>
        <span className="guided-caption">{caption}</span>
        <button type="button" className="guided-stop" onClick={stop}>
          Arrêter
        </button>
      </div>
    </div>
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
