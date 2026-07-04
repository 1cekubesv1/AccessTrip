import { describe, it, expect, afterEach, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

function stubFetch(impl: () => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(impl())),
  )
}

describe('fetchAccessibleRoute', () => {
  it('returns a verified reference route when no token is configured', async () => {
    vi.stubEnv('ORS_TOKEN', '')
    vi.resetModules()
    const { fetchAccessibleRoute } = await import('./openrouteservice')
    const out = await fetchAccessibleRoute()
    expect(out.configured).toBe(false)
    expect(out.live).toBe(false)
    expect(out.stairsFree).toBe(true)
    expect(out.source).toMatch(/référence/)
  })

  it('parses distance/duration from the wheelchair route when a token is set', async () => {
    vi.stubEnv('ORS_TOKEN', 'test-key')
    vi.resetModules()
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ routes: [{ summary: { distance: 1387, duration: 1180 } }] }),
          {
            status: 200,
          },
        ),
    )
    const { fetchAccessibleRoute } = await import('./openrouteservice')
    const out = await fetchAccessibleRoute()
    expect(out.live).toBe(true)
    expect(out.distanceM).toBe(1387)
    expect(out.durationMin).toBe(20)
    expect(out.stairsFree).toBe(true)
  })

  it('falls back to the reference route on API error', async () => {
    vi.stubEnv('ORS_TOKEN', 'test-key')
    vi.resetModules()
    stubFetch(() => new Response('nope', { status: 403 }))
    const { fetchAccessibleRoute } = await import('./openrouteservice')
    const out = await fetchAccessibleRoute()
    expect(out.live).toBe(false)
    expect(out.source).toMatch(/référence/)
  })
})
