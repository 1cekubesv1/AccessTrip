// Real SNCF open data (data.sncf.com — Opendatasoft Explore API v2.1).
// Grounds the watchdog in genuine figures: real punctuality for the Sud-Est axis
// (Paris → Nice), plus live SIRI disruptions when any are active. All calls have a
// timeout + cache + graceful fallback — the demo never blocks on the network.
const BASE = 'https://data.sncf.com/api/explore/v2.1/catalog/datasets'
const AXE = 'Sud-Est' // Paris ↔ Nice runs on the TGV Sud-Est axis

let cache = { regularity: null, at: 0 }
const TTL = 10 * 60 * 1000 // 10 min

async function getJSON(url, timeoutMs = 6000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: c.signal, headers: { accept: 'application/json' } })
    if (!res.ok) throw new Error(`SNCF HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// Real monthly regularity for the Sud-Est TGV axis (Paris → Nice).
export async function fetchAxisRegularity() {
  if (cache.regularity && Date.now() - cache.at < TTL) return cache.regularity
  try {
    const url = `${BASE}/regularite-mensuelle-tgv-axes/records?limit=1&order_by=date%20desc&where=${encodeURIComponent(`search("${AXE}")`)}`
    const data = await getJSON(url)
    const r = data.results?.[0]
    if (!r) throw new Error('no record')
    const out = {
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
    return { axe: AXE, month: null, regularite: 89.1, ponctualite: 88.6, source: 'SNCF (référence)', live: false }
  }
}

// Real PMR/disabled assistance for a station (data.sncf.com assistance-psh-pmr).
let assistCache = { data: null, at: 0 }
export async function fetchStationAssistance(search = 'Nice') {
  if (assistCache.data && Date.now() - assistCache.at < TTL) return assistCache.data
  try {
    const url = `${BASE}/assistance-psh-pmr/records?limit=5&where=${encodeURIComponent(`search("${search}")`)}`
    const data = await getJSON(url)
    const results = data.results || []
    // prefer the main station (name exactly "Nice" = Nice-Ville), else first
    const r = results.find((x) => /^nice$/i.test((x.nom || '').trim())) || results[0]
    if (!r) throw new Error('no record')
    const out = {
      gare: r.nom,
      priseEnCharge: r.typepriseencharge,
      gratuit: /gratuit/i.test(r.typetarification || ''),
      rdv: r.lieurendezvousgare,
      source: 'SNCF Open Data',
      live: true,
    }
    assistCache = { data: out, at: Date.now() }
    return out
  } catch {
    return { gare: 'Nice-Ville', priseEnCharge: 'Réservée et spontanée', gratuit: true, rdv: 'Guichet Assist\'enGare', source: 'SNCF (référence)', live: false }
  }
}

// Live SIRI-SX disruption messages (often empty when the network is nominal).
export async function fetchRealtimeDisruptions() {
  try {
    const url = `${BASE}/temps-reel-siri-sx-lite/records?limit=3`
    const data = await getJSON(url)
    return { count: data.total_count || 0, records: data.results || [], live: true }
  } catch {
    return { count: 0, records: [], live: false }
  }
}

function round1(n) {
  return typeof n === 'number' ? Math.round(n * 10) / 10 : null
}

export default { fetchAxisRegularity, fetchRealtimeDisruptions }
