import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the filesystem so state.ts never touches disk: existsSync=false forces a
// fresh seed on import, and writes are no-ops. Both default and named exports are
// provided because state.ts uses `import fs from 'node:fs'`.
vi.mock('node:fs', () => {
  const fake = {
    existsSync: () => false,
    readFileSync: () => '',
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
  return { ...fake, default: fake }
})

import {
  getState,
  resetState,
  findStep,
  setStepStatus,
  appendLedger,
  appendAgentLog,
} from './state'

describe('state', () => {
  // Restore the module-level state to a clean seed before each test.
  beforeEach(() => {
    resetState()
  })

  it('seeds a fresh state with the expected shape', () => {
    const s = getState()
    expect(s.trip.steps).toHaveLength(7)
    expect(s.traveler.name).toBe('Camille Moreau')
    expect(s.ledger.length).toBeGreaterThanOrEqual(2)
  })

  it('findStep returns a step by id, undefined otherwise', () => {
    expect(findStep('s1')?.title).toContain('Assistance')
    expect(findStep('nope')).toBeUndefined()
  })

  it('setStepStatus updates status and merges extra fields', () => {
    const step = setStepStatus('s2', 'at_risk', { reason: 'météo' })
    expect(step).not.toBeNull()
    expect(step!.status).toBe('at_risk')
    expect(step!.reason).toBe('météo')
    // reflected in the live state
    expect(findStep('s2')!.status).toBe('at_risk')
  })

  it('setStepStatus returns null for an unknown step', () => {
    expect(setStepStatus('ghost', 'done')).toBeNull()
  })

  it('appendLedger pushes an entry', () => {
    const before = getState().ledger.length
    const entry = { step: 's3', confirmed_by: 'Y', channel: 'API', at: 'T-1j', ref: 'R3' }
    appendLedger(entry)
    expect(getState().ledger).toHaveLength(before + 1)
    expect(getState().ledger.at(-1)).toEqual(entry)
  })

  it('appendAgentLog caps the feed at 500 entries', () => {
    for (let i = 0; i < 600; i++) {
      appendAgentLog({ agent: 'test', level: 'info', message: `m${i}` })
    }
    const log = getState().agentLog
    expect(log).toHaveLength(500)
    // oldest are trimmed; the newest entry is last
    expect(log.at(-1)!.message).toBe('m599')
    expect(log[0].message).toBe('m100')
  })

  it('resetState restores the pristine seed', () => {
    setStepStatus('s1', 'failed')
    appendLedger({ step: 's4', confirmed_by: 'Z', channel: 'API', at: 'T-1j', ref: 'R4' })
    const s = resetState()
    expect(s.trip.steps[0].status).toBe('reconfirmed')
    expect(s.ledger).toHaveLength(2)
  })
})
