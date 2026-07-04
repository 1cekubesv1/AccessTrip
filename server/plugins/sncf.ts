// Real SNCF open data (data.sncf.com — Opendatasoft Explore API v2.1).
// Grounds the watchdog in genuine figures: real punctuality for the Sud-Est axis
// (Paris → Nice), plus live SIRI disruptions when any are active. All calls have a
// timeout + cache + graceful fallback — the demo never blocks on the network.
import type { SncfRegularity, RealtimeDisruptions } from '../../shared/types.js'

const BASE = 'https://data.sncf.com/api/explore/v2.1/catalog/datasets'
const AXE = 'Sud-Est' // Paris ↔ Nice runs on the TGV Sud-Est axis

let cache: { regularity: SncfRegularity | null; at: number } = { regularity: null, at: 0 }
const TTL = 10 * 60 * 1000 // 10 min

// The raw Opendatasoft payload is the vendor's shape, not ours — kept loose and
// cast at the boundary. We only read the few fields below.
type OdsJson = { results?: Array<Record<string, unknown>>; total_count?: number }

async function getJSON(url: string, timeoutMs = 6000): Promise<OdsJson> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: c.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`SNCF HTTP ${res.status}`)
    return (await res.json()) as OdsJson
  } finally {
    clearTimeout(t)
  }
}

// Real monthly regularity for the Sud-Est TGV axis (Paris → Nice).
export async function fetchAxisRegularity(): Promise<SncfRegularity> {
  if (cache.regularity && Date.now() - cache.at < TTL) return cache.regularity
  try {
    const url = `${BASE}/regularite-mensuelle-tgv-axes/records?limit=1&order_by=date%20desc&where=${encodeURIComponent(`search("${AXE}")`)}`
    const data = await getJSON(url)
    const r = data.results?.[0] as Record<string, any> | undefined
    if (!r) throw new Error('no record')
    const out: SncfRegularity = {
      axe: r.axe || AXE,
      month: r.date,
      regularite: round1(r.regularite_composite),
      ponctualite: round1(r.ponctualite_origine),
      source: 'SNCF Open Data',
      live: true,
    }
    cache = { regularity: out, at: Date.now() }
    return out
  } catch {
    // fallback figures (clearly flagged not live) so the UI always shows something
    return {
      axe: AXE,
      month: null,
      regularite: 89.1,
      ponctualite: 88.6,
      source: 'SNCF (référence)',
      live: false,
    }
  }
}

// Live SIRI-SX disruption messages (often empty when the network is nominal).
export async function fetchRealtimeDisruptions(): Promise<RealtimeDisruptions> {
  try {
    const url = `${BASE}/temps-reel-siri-sx-lite/records?limit=3`
    const data = await getJSON(url)
    return { count: data.total_count || 0, records: data.results || [], live: true }
  } catch {
    return { count: 0, records: [], live: false }
  }
}

function round1(n: unknown): number | null {
  return typeof n === 'number' ? Math.round(n * 10) / 10 : null
}

export default { fetchAxisRegularity, fetchRealtimeDisruptions }
