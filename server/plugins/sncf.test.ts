import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// sncf.ts keeps a module-level 10-min cache, so each test loads a fresh copy of
// the module (resetModules) to start from an empty cache.
beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string) => Promise<Response> | Response) {
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(impl(url))))
}

describe('fetchAxisRegularity', () => {
  it('normalises the Opendatasoft record and rounds to 1 decimal', async () => {
    stubFetch(() =>
      new Response(
        JSON.stringify({
          results: [
            {
              axe: 'Sud-Est',
              date: '2026-05',
              regularite_composite: 91.2345,
              ponctualite_origine: 88.6789,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    const { fetchAxisRegularity } = await import('./sncf')
    const out = await fetchAxisRegularity()
    expect(out).toEqual({
      axe: 'Sud-Est',
      month: '2026-05',
      regularite: 91.2,
      ponctualite: 88.7,
      source: 'SNCF Open Data',
      live: true,
    })
  })

  it('falls back (live:false) when the API errors', async () => {
    stubFetch(() => new Response('nope', { status: 500 }))
    const { fetchAxisRegularity } = await import('./sncf')
    const out = await fetchAxisRegularity()
    expect(out.live).toBe(false)
    expect(out.source).toBe('SNCF (référence)')
    expect(out.regularite).toBe(89.1)
  })

  it('falls back when the results array is empty', async () => {
    stubFetch(() => new Response(JSON.stringify({ results: [] }), { status: 200 }))
    const { fetchAxisRegularity } = await import('./sncf')
    const out = await fetchAxisRegularity()
    expect(out.live).toBe(false)
  })

  it('serves the cached value on the second call without re-fetching', async () => {
    const spy = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ results: [{ axe: 'Sud-Est', date: '2026-05', regularite_composite: 90, ponctualite_origine: 90 }] }),
          { status: 200 },
        ),
      ),
    )
    vi.stubGlobal('fetch', spy)
    const { fetchAxisRegularity } = await import('./sncf')
    await fetchAxisRegularity()
    await fetchAxisRegularity()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('fetchRealtimeDisruptions', () => {
  it('maps total_count + records on success', async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ total_count: 2, results: [{ a: 1 }, { b: 2 }] }), { status: 200 }),
    )
    const { fetchRealtimeDisruptions } = await import('./sncf')
    const out = await fetchRealtimeDisruptions()
    expect(out).toEqual({ count: 2, records: [{ a: 1 }, { b: 2 }], live: true })
  })

  it('falls back to empty + live:false on error', async () => {
    stubFetch(() => new Response('x', { status: 502 }))
    const { fetchRealtimeDisruptions } = await import('./sncf')
    const out = await fetchRealtimeDisruptions()
    expect(out).toEqual({ count: 0, records: [], live: false })
  })
})
