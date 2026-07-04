// Minimal smoke test: hit the server, assert seed shape, exercise reset.
// Usage: start the server (pnpm server), then `pnpm smoke`.
import type { AppState } from '../shared/types.js'

const BASE = process.env.BASE || 'http://localhost:3000'

async function main(): Promise<void> {
  const state = (await (await fetch(`${BASE}/api/state`)).json()) as AppState
  assert(state.trip.steps.length === 7, `expected 7 steps, got ${state.trip.steps.length}`)
  assert(state.traveler.name === 'Camille Moreau', 'traveler name mismatch')
  assert(state.ledger.length >= 2, 'ledger seed missing')

  const reset = (await (await fetch(`${BASE}/api/demo/reset`, { method: 'POST' })).json()) as {
    ok: boolean
  }
  assert(reset.ok === true, 'reset did not return ok')

  console.log('SMOKE OK — 7 steps, seed intact, reset works.')
}

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('SMOKE FAIL:', msg)
    process.exit(1)
  }
}

main().catch((e: unknown) => {
  console.error('SMOKE ERROR:', (e as Error).message)
  process.exit(1)
})
