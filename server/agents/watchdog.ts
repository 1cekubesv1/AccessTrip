// Watchdog agent: catches disruptions (from the scenario catalog), narrates in
// the agent log, flips affected steps (amber/red) with reason chips, and asks the
// planner for a remediation plan. Emits SSE events so the cascade renders live.
import { getState, updateState, setStepStatus, appendAgentLog } from '../state.js'
import { pushEvent } from '../events.js'
import { planRemediation } from './planner.js'
import { getScenario } from '../scenarios.js'
import { reason, agentActive, think, delay } from './trace.js'
import { fetchAxisRegularity } from '../plugins/sncf.js'
import { fetchNiceWeather } from '../plugins/weather.js'
import type { Disruption, LogLevel, ReplanPlan } from '../../shared/types.js'

function log(agent: string, level: LogLevel, message: string): void {
  const entry = appendAgentLog({ agent, level, message })
  pushEvent('agent_log', entry)
}

// Inject a scenario (by id) and run the full cascade. Returns the proposed plan.
export async function handleChaos(scenarioId = 'tgv-delay'): Promise<ReplanPlan> {
  const scenario = getScenario(scenarioId)
  const disruption: Disruption = {
    source: scenario.source,
    details: scenario.details,
    scenarioId: scenario.id,
  }
  const state = getState()
  const affectedIds = scenario.affected.map((a) => a.stepId).join(', ')

  // 1. Record + announce the disruption — the watchdog reasons out loud
  updateState((s) => {
    s.disruptions.push(disruption)
  })
  pushEvent('disruption', disruption)
  log('watchdog', 'warn', `Perturbation détectée — ${disruption.source} : ${disruption.details}.`)

  // Ground the reasoning in real open data (SNCF punctuality / Nice weather).
  const realThoughts = [`Signal reçu de ${scenario.source}.`, `Incident : ${scenario.details}.`]
  try {
    if (scenario.source === 'SNCF') {
      const r = await fetchAxisRegularity()
      if (r) {
        const tag = r.live ? 'données réelles SNCF' : 'référence SNCF'
        realThoughts.push(
          `Contexte axe ${r.axe} : ${r.regularite}% de régularité${r.month ? ` (${tag}, ${r.month})` : ` (${tag})`}.`,
        )
        disruption.realData = { type: 'sncf', ...r }
      }
    } else if (scenario.source === 'Météo-France') {
      const w = await fetchNiceWeather()
      if (w && w.tempC != null) {
        realThoughts.push(
          `Conditions réelles à Nice : ${w.tempC}°C, ${w.label}, vent ${w.windKmh} km/h (${w.source}).`,
        )
        disruption.realData = { type: 'weather', ...w }
      }
    }
  } catch {
    /* never block the demo on the network */
  }
  realThoughts.push(
    'Recherche des étapes dépendantes en aval…',
    `Étapes impactées : ${affectedIds}. Escalade au planificateur.`,
  )

  await reason('watchdog', realThoughts, { keepActive: true })
  if (disruption.realData) pushEvent('disruption', disruption) // re-emit enriched

  // 2. Flip affected steps with reason chips (amber or red per scenario)
  for (const a of scenario.affected) {
    const step = setStepStatus(a.stepId, a.status, { reason: a.reason })
    if (step) {
      pushEvent('step_updated', { stepId: a.stepId, status: a.status, reason: a.reason })
      log(
        'watchdog',
        a.status === 'failed' ? 'error' : 'warn',
        `${a.stepId} → ${a.status} : ${a.reason}.`,
      )
      await delay(120)
    }
  }
  agentActive('watchdog', false)

  // 3. Planner reasons through the remediation
  await reason(
    'planner',
    [
      'Lecture du profil fonctionnel et des dépendances.',
      "Contrainte absolue : transfert assisté, sans marche, douche à l'italienne.",
      "Génération d'un plan de remédiation minimal…",
    ],
    { keepActive: true },
  )

  const fallback = {
    at_risk: scenario.affected.map((a) => a.stepId),
    plan: scenario.plan,
    message_voyageur: scenario.message_voyageur,
  }
  const { plan, source } = await planRemediation({
    traveler: state.traveler,
    steps: state.trip.steps,
    disruption,
    fallback,
  })
  think(
    'planner',
    source === 'claude'
      ? "Plan validé par Claude — aucun compromis d'accessibilité."
      : "Plan validé — aucun compromis d'accessibilité.",
  )
  agentActive('planner', false)
  log(
    'planner',
    'info',
    source === 'claude'
      ? "Plan recalculé par Claude (contraintes d'accessibilité préservées)."
      : 'Plan de remédiation calculé (mode hors ligne).',
  )

  // 4. Store + broadcast the proposed plan (carry minutesSaved for the KPI band)
  const planWithMeta = { ...plan, minutesSaved: scenario.minutesSaved }
  updateState((s) => {
    s.replan = planWithMeta
  })
  pushEvent('replan_proposed', { plan: planWithMeta })
  log('planner', 'info', 'Plan de remédiation proposé — en attente de validation.')

  return planWithMeta
}

// SNCF poller stub: if a real API key is set, real data would replace the fake
// disruption here. Left as a no-op hook (offline-first).
export function pollSNCF() {
  if (!process.env.SNCF_API_KEY) return null
  return null
}

export default { handleChaos, pollSNCF }
