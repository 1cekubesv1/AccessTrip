import React, { useEffect, useRef } from 'react'
import type { ReasoningEntry } from '../../../shared/types'

// The agent orchestra (Sprint 2): makes the multi-agent reasoning visible.
// Nodes light up and pulse when active; the latest thought shows under each node;
// a live reasoning stream narrates the chain of thought across agents.
const AGENTS = [
  { id: 'watchdog', icon: '🛰️', name: 'Veille', role: 'Détecte les incidents' },
  { id: 'planner', icon: '🧭', name: 'Planificateur', role: 'Recalcule sans compromis' },
  { id: 'caller', icon: '📞', name: 'Appelant', role: 'Contacte les prestataires' },
  { id: 'extractor', icon: '🧾', name: 'Extracteur', role: 'Structure les confirmations' },
  { id: 'vision', icon: '👁️', name: 'Vision', role: 'Vérifie la conformité' },
]

interface AgentGraphProps {
  agentStates?: Record<string, boolean>
  reasoning?: ReasoningEntry[]
}

export default function AgentGraph({ agentStates = {}, reasoning = [] }: AgentGraphProps) {
  const streamRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [reasoning])

  // latest thought per agent (for the node subtitle)
  const latest: Record<string, string> = {}
  for (const r of reasoning) latest[r.agent] = r.thought

  return (
    <section className="panel agent-graph" aria-labelledby="orchestra-title">
      <h2 id="orchestra-title">Orchestre d'agents</h2>
      <p className="muted" style={{ marginTop: '-0.3rem' }}>
        Le raisonnement de chaque agent IA, en direct.
      </p>

      <div className="orchestra" role="list">
        {AGENTS.map((a, i) => {
          const active = !!agentStates[a.id]
          return (
            <React.Fragment key={a.id}>
              <div
                className={`agent-node ${active ? 'is-active' : ''}`}
                role="listitem"
                aria-label={`${a.name} : ${active ? 'actif' : 'en veille'}`}
              >
                <span className="agent-node-icon" aria-hidden="true">
                  {a.icon}
                </span>
                <span className="agent-node-name">{a.name}</span>
                <span className="agent-node-role">{a.role}</span>
                <span className="agent-node-thought">
                  {active && latest[a.id] ? latest[a.id] : ''}
                </span>
                <span className={`agent-dot ${active ? 'on' : ''}`} aria-hidden="true" />
              </div>
              {i < AGENTS.length - 1 && <span className="agent-link" aria-hidden="true" />}
            </React.Fragment>
          )
        })}
      </div>

      <div
        className="reason-stream"
        ref={streamRef}
        role="log"
        aria-live="polite"
        aria-label="Raisonnement des agents en direct"
      >
        {reasoning.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            En attente d'activité. Injectez une perturbation ou lancez un appel.
          </p>
        ) : (
          reasoning.map((r, i) => (
            <div className="reason-line" key={i}>
              <span className="reason-who">{agentName(r.agent)}</span>
              <span className="reason-thought">{r.thought}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function agentName(id: string): string {
  return AGENTS.find((a) => a.id === id)?.name || id
}
