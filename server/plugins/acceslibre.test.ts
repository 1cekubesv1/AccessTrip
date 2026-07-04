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

describe('fetchAccessRegistry', () => {
  it('returns a verified reference sample when no token is configured', async () => {
    vi.stubEnv('ACCESLIBRE_TOKEN', '')
    vi.resetModules()
    const { fetchAccessRegistry } = await import('./acceslibre')
    const out = await fetchAccessRegistry()
    expect(out.configured).toBe(false)
    expect(out.live).toBe(false)
    expect(out.count).toBeNull()
    expect(out.sample.length).toBeGreaterThan(0)
    expect(out.source).toMatch(/référence/)
  })

  it('reads count + step-free count from the live API when a token is set', async () => {
    vi.stubEnv('ACCESLIBRE_TOKEN', 'test-key')
    vi.resetModules()
    let call = 0
    stubFetch(() => {
      call++
      const body =
        call === 1
          ? { count: 1240, results: [{ nom: 'Musée Matisse' }, { nom: 'Hôtel X' }] }
          : { count: 610, results: [] }
      return new Response(JSON.stringify(body), { status: 200 })
    })
    const { fetchAccessRegistry } = await import('./acceslibre')
    const out = await fetchAccessRegistry()
    expect(out.live).toBe(true)
    expect(out.configured).toBe(true)
    expect(out.count).toBe(1240)
    expect(out.accessible).toBe(610)
    expect(out.sample).toContain('Musée Matisse')
  })

  it('falls back to the reference sample on API error', async () => {
    vi.stubEnv('ACCESLIBRE_TOKEN', 'test-key')
    vi.resetModules()
    stubFetch(() => new Response('nope', { status: 403 }))
    const { fetchAccessRegistry } = await import('./acceslibre')
    const out = await fetchAccessRegistry()
    expect(out.live).toBe(false)
    expect(out.source).toMatch(/référence/)
  })
})
