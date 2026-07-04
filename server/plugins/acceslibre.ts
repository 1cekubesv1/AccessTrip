// Official accessibility registry from acceslibre (the French State's open
// database of establishment accessibility — https://acceslibre.beta.gouv.fr).
// The API is free but requires a free token: register an account, then set
// ACCESLIBRE_TOKEN in .env. Without a token we return a verified reference
// sample (the venues on Camille's itinerary), so the demo never breaks.
import type { AccessRegistry } from '../../shared/types.js'

const BASE = process.env.ACCESLIBRE_BASE_URL || 'https://acceslibre.beta.gouv.fr/api'
const TOKEN = process.env.ACCESLIBRE_TOKEN || ''
const COMMUNE = 'Nice'

let cache: { data: AccessRegistry | null; at: number } = { data: null, at: 0 }
const TTL = 30 * 60 * 1000

// Verified reference set: the accessible venues actually on Camille's Paris→Nice
// trip. Every name is real and checkable on acceslibre. Used when no token is set.
function reference(): AccessRegistry {
  return {
    commune: COMMUNE,
    count: null,
    accessible: null,
    sample: ['Hôtel Beau Rivage', 'Restaurant Le Galet', 'Gare de Nice-Ville'],
    source: 'acceslibre (référence)',
    live: false,
    configured: false,
  }
}

// The acceslibre payload is the vendor's shape — read loosely and cast.
async function get(path: string, timeoutMs = 12000): Promise<any> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: c.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AccessTrip/1.0 (hackathon demo)',
        // acceslibre expects `Authorization: Api-Key <token>`.
        Authorization: `Api-Key ${TOKEN}`,
      },
    })
    if (!res.ok) throw new Error(`acceslibre HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// Count referenced ERPs in Nice + how many have a step-free entrance, and pull a
// few names. Two lightweight queries (total, then filtered on plain-pied).
export async function fetchAccessRegistry(): Promise<AccessRegistry> {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data
  if (!TOKEN) return reference()
  try {
    const total = await get(`/erps/?commune=${encodeURIComponent(COMMUNE)}&page_size=20`)
    const results = (total.results || []) as Array<{ nom?: string }>
    const sample = results
      .map((r) => r.nom)
      .filter((n): n is string => Boolean(n))
      .slice(0, 4)

    // Step-free entrances — a separate filtered count, guarded on its own so a
    // filter-name change never sinks the whole reading.
    let accessible: number | null = null
    try {
      const stepFree = await get(
        `/erps/?commune=${encodeURIComponent(COMMUNE)}&entree_plain_pied=true&page_size=1`,
      )
      accessible = typeof stepFree.count === 'number' ? stepFree.count : null
    } catch {
      accessible = null
    }

    const out: AccessRegistry = {
      commune: COMMUNE,
      count: typeof total.count === 'number' ? total.count : null,
      accessible,
      sample,
      source: 'acceslibre (data.gouv.fr)',
      live: true,
      configured: true,
    }
    cache = { data: out, at: Date.now() }
    return out
  } catch {
    return reference()
  }
}

export default { fetchAccessRegistry }
