// Navitia real-time rail data (journeys + disruptions). Same auth scheme as the
// SNCF API (api.sncf.com is a Navitia instance): Authorization: <token>.
// Needs a real free token (navitia.io or api.sncf.com) in NAVITIA_TOKEN — the
// public "sandbox" placeholder returns 401. Fully graceful: no token / any
// failure → { live: false } and the demo is unaffected.
//
// Env: NAVITIA_TOKEN, NAVITIA_BASE_URL (default api.navitia.io),
//      NAVITIA_COVERAGE (default 'sncf' — national rail; use 'fr-idf' etc. per plan)

const PARIS_GDL = '2.373481;48.844924' // Paris Gare de Lyon (lon;lat)
const NICE_VILLE = '7.261927;43.704326' // Nice-Ville

export function hasNavitia() {
  return Boolean(process.env.NAVITIA_TOKEN)
}

function base() {
  return (process.env.NAVITIA_BASE_URL || 'https://api.navitia.io').replace(/\/$/, '')
}
function coverage() {
  return process.env.NAVITIA_COVERAGE || 'sncf'
}

async function nav(path, timeoutMs = 8000) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), timeoutMs)
  try {
    const res = await fetch(`${base()}/v1/coverage/${coverage()}${path}`, {
      signal: c.signal,
      headers: { Authorization: process.env.NAVITIA_TOKEN, 'User-Agent': 'AccessTrip/1.0' },
    })
    if (!res.ok) throw new Error(`Navitia HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

let cache = { data: null, at: 0 }
const TTL = 5 * 60 * 1000

// A real Paris → Nice journey with realtime freshness + active disruptions count.
export async function fetchLiveJourney() {
  if (!hasNavitia()) return { live: false, configured: false }
  if (cache.data && Date.now() - cache.at < TTL) return cache.data
  try {
    const data = await nav(`/journeys?from=${PARIS_GDL}&to=${NICE_VILLE}&data_freshness=realtime&count=1`)
    const j = data.journeys?.[0]
    if (!j) throw new Error('no journey')
    const disruptions = (data.disruptions || []).length
    const out = {
      live: true,
      configured: true,
      durationMin: Math.round((j.duration || 0) / 60),
      departure: fmt(j.departure_date_time),
      arrival: fmt(j.arrival_date_time),
      status: j.status || 'nominal',
      disruptions,
      source: 'Navitia',
    }
    cache = { data: out, at: Date.now() }
    return out
  } catch (err) {
    return { live: false, configured: true, error: err.message, source: 'Navitia' }
  }
}

// Navitia datetime is YYYYMMDDThhmmss → "hh:mm"
function fmt(dt) {
  if (!dt || dt.length < 15) return null
  return `${dt.slice(9, 11)}:${dt.slice(11, 13)}`
}

export default { hasNavitia, fetchLiveJourney }
