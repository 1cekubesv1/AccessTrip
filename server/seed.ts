// Seed data — matches SPEC §3 exactly. seed() returns a fresh deep copy every call
// so reset() never shares references with live state.
import type { AppState, FleetTraveler, Traveler, Trip, LedgerEntry } from '../shared/types.js'

function baseSeed(): { traveler: Traveler; trip: Trip; ledger_seed: LedgerEntry[] } {
  return {
    traveler: {
      name: 'Camille Moreau',
      age: 34,
      lang: 'fr',
      profile_functional_needs: [
        'fauteuil roulant électrique (ne peut pas transférer sans aide)',
        "besoin d'itinéraire sans marche",
        "besoin de douche à l'italienne (roll-in)",
        'assistance embarquement/débarquement train',
      ],
      equipment: {
        type: 'Fauteuil roulant électrique',
        model: 'Permobil M3',
        weight_kg: 140,
        battery: 'Lithium-ion 25.2V (conforme IATA)',
        dimensions_cm: { l: 85, w: 65, h: 96 },
      },
      caregiver: { name: 'Julien Moreau', relation: 'conjoint', access: 'read-only' },
      emergency_contact: 'Julien Moreau — 06 XX XX XX XX',
    },
    trip: {
      label: 'Paris → Nice, 12–15 septembre',
      steps: [
        {
          id: 's1',
          title: 'Assistance gare Paris Gare de Lyon',
          provider: "Assist'enGare (3212)",
          when: '12/09 08:15',
          depends_on: [],
          status: 'reconfirmed',
          ref: 'AEG-88412',
        },
        {
          id: 's2',
          title: 'TGV 6173 Paris → Nice, place PMR voiture 3',
          provider: 'SNCF',
          when: '12/09 09:03',
          depends_on: ['s1'],
          status: 'reconfirmed',
          ref: 'TGV-6173-PMR',
        },
        {
          id: 's3',
          title: 'Assistance arrivée gare de Nice-Ville',
          provider: "Assist'enGare",
          when: '12/09 14:58',
          depends_on: ['s2'],
          status: 'confirmed',
          ref: 'AEG-88413',
        },
        {
          id: 's4',
          title: 'Taxi adapté gare → hôtel',
          provider: 'Nice Taxi PMR',
          when: '12/09 15:15',
          depends_on: ['s3'],
          status: 'confirmed',
          ref: 'NTP-2209',
        },
        {
          id: 's5',
          title: 'Hôtel Beau Rivage — ch. 104 accessible, douche italienne',
          provider: 'Hôtel Beau Rivage',
          when: '12/09 15:45',
          depends_on: ['s4'],
          status: 'confirmed',
          ref: 'BR-104-ACC',
          reconfirm_due: true,
        },
        {
          id: 's6',
          title: 'Restaurant Le Galet — accès de plain-pied',
          provider: 'Le Galet',
          when: '12/09 20:00',
          depends_on: ['s5'],
          status: 'confirmed',
          ref: 'LG-1209',
        },
        {
          id: 's7',
          title: 'Retour: TGV 6176 Nice → Paris',
          provider: "SNCF + Assist'enGare",
          when: '15/09 10:37',
          depends_on: [],
          status: 'confirmed',
          ref: 'AEG-88414',
        },
      ],
    },
    ledger_seed: [
      {
        step: 's1',
        confirmed_by: "Plateforme Assist'enGare",
        channel: 'API',
        at: 'T-14j',
        ref: 'AEG-88412',
      },
      {
        step: 's5',
        confirmed_by: 'Mme Laurent (réception)',
        channel: 'appel IA',
        at: 'T-14j',
        ref: 'BR-104-ACC',
        notes: 'Ch. 104, douche italienne confirmée, lit 50cm',
      },
    ],
  }
}

// Build the runtime state shape from the raw seed.
export function seed(): AppState {
  const s = baseSeed()
  return {
    traveler: s.traveler,
    trip: s.trip,
    ledger: s.ledger_seed.map((e) => ({ ...e })),
    agentLog: [
      {
        agent: 'system',
        level: 'info',
        message: 'État initial chargé — voyage Paris → Nice prêt.',
      },
    ],
    transcript: [],
    disruptions: [],
    replan: null,
    visionVerdict: null,
    call: { status: 'idle', id: null },
    metrics: { minutesRecovered: 0, interventions: 0, callsMade: 0 },
    // Fleet: other monitored travelers (display-only). Camille (the live/interactive
    // case) is rendered from the main state above; these illustrate the portfolio.
    fleet: fleetSeed(),
  }
}

// Additional travelers with varied disability profiles and trip states, to show
// AccessTrip orchestrating a portfolio rather than a single journey.
function fleetSeed(): FleetTraveler[] {
  return [
    {
      id: 'marc',
      name: 'Marc Dubois',
      age: 41,
      profileShort: 'Malentendant · appareillé',
      needs: ['annonces visuelles', "interprète LSF à l'arrivée", 'alertes SMS'],
      route: 'Lyon → Bordeaux',
      dates: '18–20 septembre',
      confirmations: 6,
      steps: ['reconfirmed', 'reconfirmed', 'reconfirmed', 'confirmed', 'confirmed', 'confirmed'],
    },
    {
      id: 'fatima',
      name: 'Fatima Benali',
      age: 29,
      profileShort: 'Déficience visuelle · chien guide',
      needs: ['guidage tactile', 'chien guide accepté', 'documents en braille'],
      route: 'Lille → Marseille',
      dates: '14–16 septembre',
      confirmations: 4,
      steps: ['reconfirmed', 'confirmed', 'at_risk', 'confirmed', 'confirmed', 'confirmed'],
    },
    {
      id: 'thomas',
      name: 'Thomas Weber',
      age: 55,
      profileShort: 'Fauteuil manuel · autonome',
      needs: ['accès de plain-pied', 'place PMR', 'rampe embarquement'],
      route: 'Strasbourg → Paris',
      dates: '10–11 septembre',
      confirmations: 7,
      steps: ['done', 'done', 'done', 'done', 'done', 'done', 'done'],
    },
  ]
}

export default seed
