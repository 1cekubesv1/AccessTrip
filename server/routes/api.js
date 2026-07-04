// REST API. Spine (M1) + chaos cascade / replan (M2).
// Later milestones (call, vision, autofill) mount onto this same router.
import express from 'express'
import { getState, resetState, setStepStatus, appendLedger, appendAgentLog } from '../state.js'
import { pushEvent } from '../events.js'
import { handleChaos } from '../agents/watchdog.js'
import { scenarioList } from '../scenarios.js'
import { startCall, hasVapi } from '../agents/caller.js'
import { checkPhoto } from '../agents/vision.js'
import { runAutofill } from '../autofill.js'
import { fetchAxisRegularity, fetchRealtimeDisruptions, fetchStationAssistance } from '../plugins/sncf.js'
import { fetchNiceWeather } from '../plugins/weather.js'
import { fetchAccessibleVenues } from '../plugins/osm.js'
import { fetchLiveJourney } from '../plugins/navitia.js'

const router = express.Router()

// Full current state — the frontend hydrates from this on load.
router.get('/state', (req, res) => {
  res.json(getState())
})

// One-click reset to the exact seed. Broadcasts so every open tab re-hydrates.
router.post('/demo/reset', (req, res) => {
  const state = resetState()
  pushEvent('agent_log', { agent: 'system', level: 'info', message: 'Démo réinitialisée à l\'état initial.' })
  pushEvent('state_reset', { at: state.agentLog[0]?.at || null })
  res.json({ ok: true, state })
})

// List available disruption scenarios (for the demo panel).
router.get('/scenarios', (req, res) => res.json({ scenarios: scenarioList() }))

// Real-world context: live SNCF punctuality (Sud-Est axis) + Nice weather.
router.get('/context', async (req, res) => {
  try {
    const [sncf, weather, assistance, osm, navitia] = await Promise.all([
      fetchAxisRegularity(),
      fetchNiceWeather(),
      fetchStationAssistance('Nice'),
      fetchAccessibleVenues(),
      fetchLiveJourney(),
    ])
    res.json({ ok: true, sncf, weather, assistance, osm, navitia })
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message })
  }
})

// Inject a disruption scenario → watchdog + planner cascade (Flow A).
// Body: { scenarioId } (defaults to 'tgv-delay').
router.post('/demo/chaos', async (req, res) => {
  try {
    const scenarioId = req.body?.scenarioId || 'tgv-delay'
    const plan = await handleChaos(scenarioId)
    res.json({ ok: true, plan })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Trigger the re-confirmation call for s5 (Vapi if configured, else simulation).
// Body may pass { branch: 'B1'|'B2'|'B3' } to pick the simulated scenario.
router.post('/call/start', async (req, res) => {
  try {
    const branch = req.body?.branch || 'B2'
    // fire-and-forget: the call streams over SSE; respond immediately
    startCall({ branch }).catch((err) => console.error('[call] failed:', err.message))
    res.json({ ok: true, mode: hasVapi() ? 'vapi' : 'simulation', branch })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Apply the proposed remediation plan: flip affected steps back green with new
// times, append ledger receipts, clear the pending plan.
router.post('/replan/apply', (req, res) => {
  const state = getState()
  const plan = state.replan
  if (!plan) return res.status(409).json({ ok: false, error: 'Aucun plan à appliquer' })

  for (const item of plan.plan) {
    const step = setStepStatus(item.stepId, 'reconfirmed', { when: item.new_time, reason: null })
    if (!step) continue
    pushEvent('step_updated', { stepId: item.stepId, status: 'reconfirmed', when: item.new_time, reason: null })

    const entry = appendLedger({
      step: item.stepId,
      confirmed_by: 'Agent planificateur AccessTrip',
      channel: 'replanification',
      at: "aujourd'hui",
      ref: step.ref,
      notes: `${item.action} → ${item.new_time}`,
    })
    pushEvent('ledger_entry', { entry })
  }

  const applied = appendAgentLog({ agent: 'planner', level: 'info', message: 'Plan appliqué — toutes les étapes re-confirmées.' })
  pushEvent('agent_log', applied)

  // Impact metrics (KPI band)
  state.metrics.interventions += 1
  state.metrics.minutesRecovered += Number(plan.minutesSaved || 0)
  pushEvent('metrics', state.metrics)

  state.replan = null
  pushEvent('replan_proposed', { plan: null })

  res.json({ ok: true, state })
})

// Vision check (M5). Accepts { base64, mediaType } JSON (frontend reads the file
// as a data URL) — simpler and dep-free vs multipart. Falls back to a canned
// verdict when no image / no Claude key so the demo always shows a result.
router.post('/vision/check', async (req, res) => {
  try {
    const image = req.body && req.body.base64 ? req.body : null
    const verdict = await checkPhoto(image)
    res.json({ ok: true, verdict })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// --- M6 "invisible insurance": presenter can force any SSE event manually ---

// Force a step to any status (with optional reason/when). Mutates + broadcasts.
router.post('/demo/force-step', (req, res) => {
  const { stepId, status, reason = null, when } = req.body || {}
  if (!stepId || !status) return res.status(400).json({ ok: false, error: 'stepId + status requis' })
  const extra = { reason }
  if (when) extra.when = when
  const step = setStepStatus(stepId, status, extra)
  if (!step) return res.status(404).json({ ok: false, error: 'étape inconnue' })
  pushEvent('step_updated', { stepId, status, reason, ...(when ? { when } : {}) })
  const entry = appendAgentLog({ agent: 'présentateur', level: 'info', message: `Forçage manuel : ${stepId} → ${status}.` })
  pushEvent('agent_log', entry)
  res.json({ ok: true, step })
})

// Generic manual event emitter — push any SSE event (agent_log, transcript_chunk,
// disruption, …) so the presenter can fake it live if the real one fails.
router.post('/demo/emit', (req, res) => {
  const { type, payload = {} } = req.body || {}
  if (!type) return res.status(400).json({ ok: false, error: 'type requis' })
  if (type === 'agent_log') appendAgentLog(payload)
  pushEvent(type, payload)
  res.json({ ok: true })
})

// Autofill (M5): launch headed Playwright on the local PRM form.
router.post('/autofill/run', async (req, res) => {
  try {
    const result = await runAutofill({ port: process.env.PORT || 3000 })
    res.json(result)
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
