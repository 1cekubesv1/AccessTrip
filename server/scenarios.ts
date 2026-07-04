// Catalogue of disruption scenarios (Sprint 1). Each one defines what breaks,
// which steps it hits (amber "at_risk" or red "failed"), the accessibility-safe
// remediation plan, a reassuring traveler message, and the minutes it recovers.
// All deterministic so the demo runs offline; Claude can still refine the plan.
import type { StepStatus, ReplanItem } from '../shared/types.js'

export interface ScenarioAffected {
  stepId: string
  status: StepStatus
  reason: string
}

export interface Scenario {
  id: string
  label: string
  source: string
  details: string
  minutesSaved: number
  affected: ScenarioAffected[]
  plan: ReplanItem[]
  message_voyageur: string
}

export const SCENARIOS: Record<string, Scenario> = {
  'tgv-delay': {
    id: 'tgv-delay',
    label: 'Retard TGV (55 min)',
    source: 'SNCF',
    details: 'TGV 6173 retardé de 55 min',
    minutesSaved: 55,
    affected: [
      { stepId: 's3', status: 'at_risk', reason: 'TGV 6173 retardé de 55 min, arrivée repoussée' },
      {
        stepId: 's4',
        status: 'at_risk',
        reason: "Aligné sur la nouvelle heure d'arrivée assistée",
      },
    ],
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
  },

  strike: {
    id: 'strike',
    label: 'Grève SNCF (train supprimé)',
    source: 'SNCF',
    details: 'Grève — TGV 6173 supprimé',
    minutesSaved: 120,
    affected: [
      { stepId: 's2', status: 'failed', reason: 'TGV 6173 supprimé (grève)' },
      { stepId: 's3', status: 'at_risk', reason: 'Dépend du train supprimé' },
      { stepId: 's4', status: 'at_risk', reason: 'Dépend du train supprimé' },
      { stepId: 's5', status: 'at_risk', reason: 'Arrivée hôtel décalée' },
    ],
    plan: [
      {
        stepId: 's2',
        action: 'Report sur TGV 6175, place PMR voiture 3',
        new_time: '12/09 11:03',
        rationale: 'Prochain TGV avec emplacement UFR garanti',
      },
      {
        stepId: 's3',
        action: 'Assistance arrivée Nice-Ville re-planifiée',
        new_time: '12/09 16:58',
        rationale: 'Nouvel horaire du train de report',
      },
      {
        stepId: 's4',
        action: 'Taxi adapté re-planifié',
        new_time: '12/09 17:15',
        rationale: 'Aligné sur la nouvelle arrivée',
      },
      {
        stepId: 's5',
        action: 'Hôtel Beau Rivage prévenu, chambre 104 maintenue',
        new_time: '12/09 17:45',
        rationale: 'Arrivée tardive signalée',
      },
    ],
    message_voyageur:
      "Votre train est supprimé à cause d'une grève, mais nous vous avons déjà replacée sur le TGV suivant avec un emplacement adapté. Toute la suite est réajustée.",
  },

  elevator: {
    id: 'elevator',
    label: 'Ascenseur PMR en panne (gare Nice)',
    source: 'Gare de Nice-Ville',
    details: 'Ascenseur PMR quai 2 hors service',
    minutesSaved: 20,
    affected: [
      { stepId: 's3', status: 'at_risk', reason: 'Accès sans marche compromis au quai 2' },
    ],
    plan: [
      {
        stepId: 's3',
        action: 'Sortie assistée alternative + rampe mobile (itinéraire sans marche validé)',
        new_time: '12/09 15:05',
        rationale: 'Ascenseur HS — chemin de plain-pied garanti par un autre accès',
      },
    ],
    message_voyageur:
      'Un ascenseur est en panne à Nice, mais un itinéraire sans marche avec rampe et assistance est déjà prévu. Aucun transfert dans les escaliers.',
  },

  weather: {
    id: 'weather',
    label: 'Alerte météo (orage Nice)',
    source: 'Météo-France',
    details: 'Alerte orange orage sur Nice',
    minutesSaved: 25,
    affected: [
      { stepId: 's4', status: 'at_risk', reason: 'Conditions météo — trajet taxi ralenti' },
    ],
    plan: [
      {
        stepId: 's4',
        action: 'Taxi adapté décalé, itinéraire abrité gare → hôtel',
        new_time: '12/09 15:40',
        rationale: 'Créneau ajusté pour éviter le pic orageux',
      },
    ],
    message_voyageur:
      'Un orage est annoncé à Nice. Votre taxi adapté est légèrement décalé sur un itinéraire abrité, rien à changer de votre côté.',
  },

  'taxi-cancel': {
    id: 'taxi-cancel',
    label: 'Taxi adapté annulé',
    source: 'Nice Taxi PMR',
    details: 'Taxi adapté annulé (véhicule en panne)',
    minutesSaved: 30,
    affected: [
      { stepId: 's4', status: 'failed', reason: 'Véhicule UFR en panne — course annulée' },
    ],
    plan: [
      {
        stepId: 's4',
        action: 'Prestataire PMR alternatif (Riviera Access), véhicule UFR équivalent',
        new_time: '12/09 15:35',
        rationale: 'Nouveau véhicule adapté sécurisé',
      },
    ],
    message_voyageur:
      "Votre taxi adapté est tombé en panne, mais un véhicule équivalent d'un autre prestataire est déjà réservé. Vous serez prise en charge quasiment à l'heure.",
  },
}

export function getScenario(id: string): Scenario {
  return SCENARIOS[id] || SCENARIOS['tgv-delay']
}

export function scenarioList(): Array<{ id: string; label: string }> {
  return Object.values(SCENARIOS).map((s) => ({ id: s.id, label: s.label }))
}

export default { SCENARIOS, getScenario, scenarioList }
