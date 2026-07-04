import { describe, it, expect } from 'vitest'
import { reduce } from './useEvents'
import type { AppState } from '../../shared/types'

// A minimal but valid AppState to reduce against. Only the fields each test reads
// need realistic values; the rest are empty defaults matching the seed shape.
function baseState(): AppState {
  return {
    traveler: {} as AppState['traveler'],
    trip: {
      label: 'Paris → Nice',
      steps: [
        { id: 's1', title: 'A', provider: 'P', when: 'now', depends_on: [], status: 'confirmed', ref: 'R1' },
        { id: 's2', title: 'B', provider: 'P', when: 'later', depends_on: ['s1'], status: 'confirmed', ref: 'R2' },
      ],
    },
    ledger: [],
    agentLog: [],
    transcript: [],
    disruptions: [],
    replan: null,
    visionVerdict: null,
    call: { status: 'idle', id: null },
    metrics: { minutesRecovered: 0, interventions: 0, callsMade: 0 },
    fleet: [],
  }
}

describe('reduce', () => {
  it('returns a new object without mutating prev', () => {
    const prev = baseState()
    const next = reduce(prev, 'metrics', { callsMade: 1 })
    expect(next).not.toBe(prev)
    expect(prev.metrics.callsMade).toBe(0)
  })

  it('step_updated patches the matching step by id', () => {
    const prev = baseState()
    const next = reduce(prev, 'step_updated', { stepId: 's2', status: 'at_risk', reason: 'weather' })
    expect(next.trip.steps[1].status).toBe('at_risk')
    expect(next.trip.steps[1].reason).toBe('weather')
    // untouched step keeps its status; original array is not mutated
    expect(next.trip.steps[0].status).toBe('confirmed')
    expect(prev.trip.steps[1].status).toBe('confirmed')
  })

  it('step_updated keeps existing status when payload omits it', () => {
    const prev = baseState()
    const next = reduce(prev, 'step_updated', { stepId: 's1', reason: 'note' })
    expect(next.trip.steps[0].status).toBe('confirmed')
    expect(next.trip.steps[0].reason).toBe('note')
  })

  it('agent_log appends to the log', () => {
    const prev = baseState()
    const entry = { agent: 'planner', level: 'info' as const, message: 'hi' }
    const next = reduce(prev, 'agent_log', entry)
    expect(next.agentLog).toHaveLength(1)
    expect(next.agentLog[0]).toEqual(entry)
  })

  it('transcript_chunk appends to the transcript', () => {
    const prev = baseState()
    const chunk = { speaker: 'assistant' as const, text: 'bonjour' }
    const next = reduce(prev, 'transcript_chunk', chunk)
    expect(next.transcript).toEqual([chunk])
  })

  it('ledger_entry unwraps { entry }', () => {
    const prev = baseState()
    const entry = { step: 's1', confirmed_by: 'X', channel: 'API', at: 'T-1j', ref: 'R1' }
    const next = reduce(prev, 'ledger_entry', { entry })
    expect(next.ledger).toEqual([entry])
  })

  it('ledger_entry accepts a bare entry too', () => {
    const prev = baseState()
    const entry = { step: 's1', confirmed_by: 'X', channel: 'API', at: 'T-1j', ref: 'R1' }
    const next = reduce(prev, 'ledger_entry', entry as any)
    expect(next.ledger).toEqual([entry])
  })

  it('disruption appends', () => {
    const prev = baseState()
    const d = { source: 'SNCF', details: 'retard' }
    const next = reduce(prev, 'disruption', d)
    expect(next.disruptions).toEqual([d])
  })

  it('replan_proposed sets the plan', () => {
    const prev = baseState()
    const plan = { at_risk: ['s2'], plan: [], message_voyageur: 'ok' }
    const next = reduce(prev, 'replan_proposed', { plan })
    expect(next.replan).toEqual(plan)
  })

  it('replan_proposed clears to null when plan is explicitly null', () => {
    const prev = { ...baseState(), replan: { at_risk: [], plan: [], message_voyageur: 'x' } }
    const next = reduce(prev, 'replan_proposed', { plan: null })
    expect(next.replan).toBeNull()
  })

  it('vision_verdict unwraps { verdict }', () => {
    const prev = baseState()
    const verdict = { conforme: true, confiance: 0.9, critere: 'roll-in', preuve: 'photo', recommandation: 'ok' }
    const next = reduce(prev, 'vision_verdict', { verdict })
    expect(next.visionVerdict).toEqual(verdict)
  })

  it('call_status merges onto existing call state', () => {
    const prev = baseState()
    const next = reduce(prev, 'call_status', { status: 'dialing', id: 'c1' })
    expect(next.call).toEqual({ status: 'dialing', id: 'c1' })
  })

  it('metrics merges onto existing metrics', () => {
    const prev = { ...baseState(), metrics: { minutesRecovered: 5, interventions: 1, callsMade: 2 } }
    const next = reduce(prev, 'metrics', { callsMade: 3 })
    expect(next.metrics).toEqual({ minutesRecovered: 5, interventions: 1, callsMade: 3 })
  })

  it('agent_state records active flag keyed by agent', () => {
    const prev = baseState()
    const next = reduce(prev, 'agent_state', { agent: 'caller', active: true })
    expect(next.agentStates).toEqual({ caller: true })
  })

  it('agent_reasoning appends and keeps only the last 14', () => {
    let s = baseState()
    for (let i = 0; i < 20; i++) {
      s = reduce(s, 'agent_reasoning', { agent: 'planner', thought: `t${i}` })
    }
    expect(s.reasoning).toHaveLength(14)
    expect(s.reasoning![0].thought).toBe('t6')
    expect(s.reasoning![13].thought).toBe('t19')
  })

  it('unknown event type returns state unchanged (shallow copy)', () => {
    const prev = baseState()
    const next = reduce(prev, 'nope' as any, {})
    expect(next).toEqual(prev)
  })
})
