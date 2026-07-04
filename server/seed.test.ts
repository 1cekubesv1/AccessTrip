import { describe, it, expect } from 'vitest'
import { seed } from './seed'

describe('seed', () => {
  it('matches the shape scripts/smoke.ts asserts', () => {
    const s = seed()
    expect(s.trip.steps).toHaveLength(7)
    expect(s.traveler.name).toBe('Camille Moreau')
    expect(s.ledger).toHaveLength(2)
  })

  it('returns a fresh deep copy each call (no shared references)', () => {
    const a = seed()
    const b = seed()
    expect(a).not.toBe(b)
    expect(a.trip.steps).not.toBe(b.trip.steps)
    a.trip.steps[0].status = 'failed'
    a.ledger.push({ step: 'x', confirmed_by: 'x', channel: 'x', at: 'x', ref: 'x' })
    // mutating one copy leaves a freshly-seeded copy untouched
    expect(b.trip.steps[0].status).toBe('reconfirmed')
    expect(b.ledger).toHaveLength(2)
  })

  it('initialises idle call, zeroed metrics, and the fleet portfolio', () => {
    const s = seed()
    expect(s.call).toEqual({ status: 'idle', id: null })
    expect(s.metrics).toEqual({ minutesRecovered: 0, interventions: 0, callsMade: 0 })
    expect(s.replan).toBeNull()
    expect(s.visionVerdict).toBeNull()
    expect(s.fleet.map((f) => f.id)).toEqual(['marc', 'fatima', 'thomas'])
  })

  it('every step has a unique id and valid dependencies', () => {
    const s = seed()
    const ids = new Set(s.trip.steps.map((st) => st.id))
    expect(ids.size).toBe(s.trip.steps.length)
    for (const st of s.trip.steps) {
      for (const dep of st.depends_on) {
        expect(ids.has(dep)).toBe(true)
      }
    }
  })
})
