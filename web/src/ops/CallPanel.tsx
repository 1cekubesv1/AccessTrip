import React, { useEffect, useRef, useState } from 'react'
import { speak, cancelSpeech, supportsSpeech } from '../lib/speech'
import type { CallState, TranscriptChunk } from '../../../shared/types'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Aucun appel',
  dialing: 'Numérotation…',
  ringing: 'Sonnerie…',
  in_progress: 'En cours',
  ended: 'Terminé',
  extracted: 'Analysé',
}

interface CallPanelProps {
  call?: Partial<CallState>
  transcript?: TranscriptChunk[]
}

// Live call panel: status + transcript bubbles, spoken aloud in a French voice as
// they stream. aria-live=polite so VoiceOver also announces each new line.
export default function CallPanel({ call = {}, transcript = [] }: CallPanelProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const spokenRef = useRef(0) // how many bubbles we've already voiced
  const [voiceOn, setVoiceOn] = useState(true)
  const canSpeak = supportsSpeech()

  // On mount / after a reset, don't replay bubbles already present (e.g. on reload).
  useEffect(() => {
    if (transcript.length === 0) spokenRef.current = 0
  }, [transcript.length])

  // Speak newly-arrived bubbles.
  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight

    if (!voiceOn || !canSpeak) {
      spokenRef.current = transcript.length
      return
    }
    if (transcript.length > spokenRef.current) {
      for (let i = spokenRef.current; i < transcript.length; i++) {
        const c = transcript[i]
        speak(c.text, { who: c.speaker === 'assistant' ? 'assistant' : 'human' })
      }
      spokenRef.current = transcript.length
    }
  }, [transcript, voiceOn, canSpeak])

  useEffect(() => () => cancelSpeech(), []) // stop speech when unmounting

  const status = call.status || 'idle'
  const active = status !== 'idle'

  function toggleVoice() {
    setVoiceOn((v) => {
      if (v) cancelSpeech()
      return !v
    })
  }

  return (
    <section className="panel" aria-labelledby="call-title">
      <div className="panel-head">
        <h2 id="call-title" style={{ margin: 0 }}>
          Appel de re-confirmation
          <span className="call-status" data-status={status}>
            {' '}
            · {STATUS_LABEL[status] || status}
            {call.mode === 'simulation' && active && <span className="muted"> (simulation)</span>}
          </span>
        </h2>
        {canSpeak && (
          <button
            type="button"
            className="voice-toggle"
            onClick={toggleVoice}
            aria-pressed={voiceOn}
            title={voiceOn ? 'Couper la voix' : 'Activer la voix'}
          >
            {voiceOn ? '🔊 Voix' : '🔇 Muet'}
          </button>
        )}
      </div>

      <div
        className="transcript"
        ref={boxRef}
        role="log"
        aria-live="polite"
        aria-label="Transcription de l'appel en direct"
      >
        {transcript.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {active ? 'Connexion…' : "Aucune transcription. Lancez l'appel depuis le panneau démo."}
          </p>
        ) : (
          transcript.map((c, i) => (
            <div
              key={i}
              className={`bubble ${c.speaker === 'assistant' ? 'bubble-ia' : 'bubble-human'}`}
            >
              <span className="bubble-who">
                {c.speaker === 'assistant' ? 'Assistante IA' : 'Réception'}
              </span>
              <span className="bubble-text">{c.text}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
