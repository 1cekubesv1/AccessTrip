// Planner agent: given the traveler profile, trip steps, and a disruption,
// determines which steps are at risk and proposes a minimal remediation plan that
// never compromises accessibility. Uses Claude when available; falls back to a
// hardcoded plan so Flow A always runs offline.
import { claudeJSON, hasClaude } from './claude.js'
import type { Traveler, Step, Disruption, ReplanPlan } from '../../shared/types.js'

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    at_risk: { type: 'array', items: { type: 'string' } },
    plan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          stepId: { type: 'string' },
          action: { type: 'string' },
          new_time: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['stepId', 'action', 'new_time', 'rationale'],
      },
    },
    message_voyageur: { type: 'string' },
  },
  required: ['at_risk', 'plan', 'message_voyageur'],
}

const SYSTEM = `Tu es l'agent planificateur d'AccessTrip. Voici le profil fonctionnel du voyageur, les étapes du voyage avec dépendances, et un événement de perturbation. Détermine quelles étapes sont à risque et propose un plan de remédiation minimal qui préserve les besoins d'accessibilité (jamais de compromis sur: transfert assisté, sans marche, douche italienne). Réponds en JSON: {at_risk: [stepId], plan: [{stepId, action, new_time, rationale}], message_voyageur: '...'}. Le message_voyageur doit être calme et rassurant, 2 phrases max.`

// Deterministic fallback for the seed disruption (TGV 6173 retardé). Chosen to
// match the spec's Flow A narrative exactly so the demo is predictable.
export function fallbackPlan(): ReplanPlan {
  return {
    at_risk: ['s3', 's4'],
    plan: [
      {
        stepId: 's3',
        action: "Nouveau créneau d'assistance arrivée Nice-Ville",
        new_time: '12/09 15:53',
        rationale: 'TGV 6173 retardé de 55 min, arrivée repoussée',
      },
      {
        stepId: 's4',
        action: 'Taxi adapté repoussé',
        new_time: '12/09 15:55',
        rationale: "Aligné sur la nouvelle heure d'arrivée assistée",
      },
      {
        stepId: 's5',
        action: 'Hôtel Beau Rivage prévenu du retard',
        new_time: '12/09 16:40',
        rationale: 'Arrivée tardive signalée, chambre 104 accessible maintenue',
      },
    ],
    message_voyageur:
      "Votre TGV a du retard, mais tout est déjà réorganisé. Votre assistance et votre taxi vous attendront à la nouvelle heure, et l'hôtel est prévenu.",
  }
}

export interface PlanRemediationArgs {
  traveler: Traveler
  steps: Step[]
  disruption: Disruption
  fallback?: ReplanPlan
}

export interface PlanRemediationResult {
  plan: ReplanPlan
  source: 'claude' | 'fallback'
  error?: string
}

// `fallback` is the deterministic plan for this disruption (from the scenario
// catalog). Claude refines it when available; otherwise the fallback is used.
export async function planRemediation({
  traveler,
  steps,
  disruption,
  fallback,
}: PlanRemediationArgs): Promise<PlanRemediationResult> {
  const fb = fallback || fallbackPlan()
  if (!hasClaude()) return { plan: fb, source: 'fallback' }

  try {
    const user = JSON.stringify({
      profil_fonctionnel: traveler.profile_functional_needs,
      etapes: steps.map((s) => ({
        id: s.id,
        titre: s.title,
        quand: s.when,
        depend_de: s.depends_on,
        statut: s.status,
      })),
      perturbation: disruption,
    })
    const plan = await claudeJSON({ system: SYSTEM, user, schema: PLAN_SCHEMA })
    if (!plan.at_risk?.length || !plan.plan?.length) return { plan: fb, source: 'fallback' }
    return { plan, source: 'claude' }
  } catch (err) {
    return { plan: fb, source: 'fallback', error: err.message }
  }
}

export default { planRemediation, fallbackPlan }
