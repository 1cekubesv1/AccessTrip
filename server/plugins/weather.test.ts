import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchNiceWeather } from './weather'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(impl())),
  )
}

describe('fetchNiceWeather', () => {
  it('normalises current conditions and rounds temp/wind', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            current: { temperature_2m: 21.6, weather_code: 3, wind_speed_10m: 12.4 },
          }),
          { status: 200 },
        ),
    )
    const out = await fetchNiceWeather()
    expect(out).toEqual({
      tempC: 22,
      windKmh: 12,
      code: 3,
      label: 'Couvert',
      disruptive: false,
      source: 'Open-Meteo',
      live: true,
    })
  })

  it('flags disruptive conditions (e.g. heavy rain code 65)', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ current: { temperature_2m: 14, weather_code: 65, wind_speed_10m: 30 } }),
          { status: 200 },
        ),
    )
    const out = await fetchNiceWeather()
    expect(out.label).toBe('Pluie forte')
    expect(out.disruptive).toBe(true)
  })

  it('maps an unknown weather code to a neutral label', async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ current: { temperature_2m: 18, weather_code: 999, wind_speed_10m: 5 } }),
          { status: 200 },
        ),
    )
    const out = await fetchNiceWeather()
    expect(out.label).toBe('Conditions variables')
    expect(out.disruptive).toBe(false)
  })

  it('falls back to Indisponible (live:false) on API error', async () => {
    stubFetch(() => new Response('x', { status: 503 }))
    const out = await fetchNiceWeather()
    expect(out).toEqual({
      tempC: null,
      windKmh: null,
      code: null,
      label: 'Indisponible',
      disruptive: false,
      source: 'Open-Meteo',
      live: false,
    })
  })
})
