import React, { useEffect, useRef } from 'react'
import type { AgentLogEntry } from '../../../shared/types'

interface AgentLogProps {
  log: AgentLogEntry[]
}

// Terminal-style feed where every agent narrates its reasoning in short French lines.
// aria-live=polite so VoiceOver announces new lines without stealing focus.
export default function AgentLog({ log }: AgentLogProps) {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  return (
    <section className="panel" aria-labelledby="agentlog-title">
      <h2 id="agentlog-title">Journal des agents</h2>
      <div
        className="agent-log"
        ref={boxRef}
        role="log"
        aria-live="polite"
        aria-label="Journal des agents en direct"
      >
        {log.length === 0 ? (
          <div className="agent-line">
            <span className="msg muted">En attente d'activité…</span>
          </div>
        ) : (
          log.map((l, i) => (
            <div className="agent-line" data-level={l.level || 'info'} key={i}>
              <span className="who">[{l.agent}]</span>
              <span className="msg">{l.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
