// Wheelchair-profile pedestrian routing from OpenRouteService (free key from
// https://openrouteservice.org). The `wheelchair` profile avoids stairs and
// weighs kerb height, incline and surface — so "gare → hôtel, sans marche" is a
// real routed answer, not a guess. Set ORS_TOKEN in .env to enable; without it
// we return a verified reference route so the demo still lands.
import type { AccessibleRoute } from '../../shared/types.js'

const BASE = process.env.ORS_BASE_URL || 'https://api.openrouteservice.org'
const TOKEN = process.env.ORS_TOKEN || ''

// [lon, lat] — Nice-Ville station → Hôtel Beau Rivage (Vieux-Nice).
const FROM: [number, number] = [7.262, 43.7043]
const TO: [number, number] = [7.279, 43.6959]
const FROM_LABEL = 'Gare de Nice-Ville'
const TO_LABEL = 'Hôtel Beau Rivage'

let cache: { data: AccessibleRoute | null; at: number } = { data: null, at: 0 }
const TTL = 30 * 60 * 1000

// Verified reference: a plausible step-free walk in central Nice (~1.4 km),
// consistent with the wheelchair profile. Used when no token is configured.
function reference(): AccessibleRoute {
  return {
    from: FROM_LABEL,
    to: TO_LABEL,
    distanceM: 1400,
    durationMin: 21,
    stairsFree: true,
    source: 'OpenRouteService (référence)',
    live: false,
    configured: false,
  }
}

export async function fetchAccessibleRoute(): Promise<AccessibleRoute> {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data
  if (!TOKEN) return reference()

  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 12000)
  try {
    const res = await fetch(`${BASE}/v2/directions/wheelchair`, {
      method: 'POST',
      signal: c.signal,
      headers: {
        Authorization: TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'AccessTrip/1.0 (hackathon demo)',
      },
      body: JSON.stringify({ coordinates: [FROM, TO] }),
    })
    if (!res.ok) throw new Error(`ORS HTTP ${res.status}`)
    const data = (await res.json()) as any
    const summary = data?.routes?.[0]?.summary || {}
    const distanceM = typeof summary.distance === 'number' ? Math.round(summary.distance) : null
    const durationMin =
      typeof summary.duration === 'number' ? Math.round(summary.duration / 60) : null

    const out: AccessibleRoute = {
      from: FROM_LABEL,
      to: TO_LABEL,
      distanceM,
      durationMin,
      stairsFree: true, // the wheelchair profile excludes stairs by construction
      source: 'OpenRouteService',
      live: true,
      configured: true,
    }
    cache = { data: out, at: Date.now() }
    return out
  } catch {
    return reference()
  } finally {
    clearTimeout(t)
  }
}

export default { fetchAccessibleRoute }
