import { useEffect, useRef, useState, useCallback } from 'react'
import type { AppState, ServerEventType, ServerEventMap } from '../../shared/types'

export interface UseEventsResult {
  state: AppState | null
  connected: boolean
  reload: () => Promise<AppState>
}

// Single SSE hook: hydrates full state from /api/state, then applies live events.
// Returns { state, connected, reload }.
export function useEvents(): UseEventsResult {
  const [state, setState] = useState<AppState | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const reload = useCallback(async (): Promise<AppState> => {
    const res = await fetch('/api/state')
    const data = (await res.json()) as AppState
    setState(data)
    return data
  }, [])

  useEffect(() => {
    reload()

    const es = new EventSource('/events')
    esRef.current = es
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    const apply = <T extends ServerEventType>(type: T, payload: ServerEventMap[T]) => {
      setState((prev) => (prev ? reduce(prev, type, payload) : prev))
    }

    // Named events emitted by the server. A full reset just re-hydrates.
    const named: ServerEventType[] = [
      'step_updated',
      'agent_log',
      'transcript_chunk',
      'ledger_entry',
      'disruption',
      'replan_proposed',
      'vision_verdict',
      'call_status',
      'metrics',
      'agent_state',
      'agent_reasoning',
    ]
    named.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const { payload } = JSON.parse(e.data)
          apply(type, payload)
        } catch {
          /* ignore malformed */
        }
      })
    })

    es.addEventListener('state_reset', () => {
      reload()
    })

    return () => es.close()
  }, [reload])

  return { state, connected, reload }
}

// Pure reducer: apply one live event onto the previous state (immutably enough for
// React). `payload` is the wire payload for `type` per ServerEventMap; the switch
// widens it, so we read it loosely and rely on AppState to type every assignment.
export function reduce(prev: AppState, type: ServerEventType, payload: any): AppState {
  const next: AppState = { ...prev }
  switch (type) {
    case 'step_updated': {
      next.trip = {
        ...prev.trip,
        steps: prev.trip.steps.map((s) =>
          s.id === payload.stepId ? { ...s, ...payload, status: payload.status ?? s.status } : s,
        ),
      }
      break
    }
    case 'agent_log':
      next.agentLog = [...(prev.agentLog || []), payload]
      break
    case 'transcript_chunk':
      next.transcript = [...(prev.transcript || []), payload]
      break
    case 'ledger_entry':
      next.ledger = [...(prev.ledger || []), payload.entry ?? payload]
      break
    case 'disruption':
      next.disruptions = [...(prev.disruptions || []), payload]
      break
    case 'replan_proposed':
      // payload.plan is explicitly null when the plan is cleared after apply
      next.replan = 'plan' in payload ? payload.plan : payload
      break
    case 'vision_verdict':
      next.visionVerdict = payload.verdict ?? payload
      break
    case 'call_status':
      next.call = { ...(prev.call || {}), ...payload }
      break
    case 'metrics':
      next.metrics = { ...(prev.metrics || {}), ...payload }
      break
    case 'agent_state':
      next.agentStates = { ...(prev.agentStates || {}), [payload.agent]: payload.active }
      break
    case 'agent_reasoning':
      next.reasoning = [...(prev.reasoning || []), payload].slice(-14)
      break
    default:
      break
  }
  return next
}

export default useEvents
