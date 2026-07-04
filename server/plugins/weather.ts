// Real weather for Nice (Open-Meteo — free, no key). Used to ground the météo
// disruption scenario and show a real-conditions indicator. Timeout + fallback.
import type { NiceWeather } from '../../shared/types.js'

const NICE = { lat: 43.7031, lon: 7.2661 }

// WMO weather codes → French label + whether it's a disruptive condition.
function describe(code: number | null | undefined): [string, boolean] {
  const map: Record<number, [string, boolean]> = {
    0: ['Ciel dégagé', false],
    1: ['Peu nuageux', false],
    2: ['Partiellement nuageux', false],
    3: ['Couvert', false],
    45: ['Brouillard', true],
    48: ['Brouillard givrant', true],
    51: ['Bruine légère', false],
    53: ['Bruine', false],
    55: ['Bruine dense', true],
    61: ['Pluie faible', false],
    63: ['Pluie', true],
    65: ['Pluie forte', true],
    71: ['Neige faible', true],
    73: ['Neige', true],
    75: ['Neige forte', true],
    80: ['Averses', true],
    81: ['Averses fortes', true],
    82: ['Averses violentes', true],
    95: ['Orage', true],
    96: ['Orage + grêle', true],
    99: ['Orage violent', true],
  }
  return (code != null && map[code]) || ['Conditions variables', false]
}

export async function fetchNiceWeather(): Promise<NiceWeather> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 6000)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${NICE.lat}&longitude=${NICE.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FParis`
    const res = await fetch(url, { signal: c.signal })
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
    const data = (await res.json()) as { current?: Record<string, any> }
    const cur = data.current || {}
    const [label, disruptive] = describe(cur.weather_code)
    return {
      tempC: Math.round(cur.temperature_2m),
      windKmh: Math.round(cur.wind_speed_10m),
      code: cur.weather_code,
      label,
      disruptive,
      source: 'Open-Meteo',
      live: true,
    }
  } catch {
    return {
      tempC: null,
      windKmh: null,
      code: null,
      label: 'Indisponible',
      disruptive: false,
      source: 'Open-Meteo',
      live: false,
    }
  } finally {
    clearTimeout(t)
  }
}

export default { fetchNiceWeather }
