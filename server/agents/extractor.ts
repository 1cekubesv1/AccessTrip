// Extractor agent (M4): turns a call transcript into a structured confirmation.
// Uses Claude when available, with a deterministic keyword fallback so Flow B runs
// offline. On a failed re-confirmation it drives the escalation + recovery path.
import { getState, setStepStatus, appendLedger, appendAgentLog } from '../state.js'
import { pushEvent } from '../events.js'
import { claudeJSON, claudeEnabled } from './claude.js'
import { reason, agentActive, think } from './trace.js'
import type { TranscriptChunk, Extracted, ReplanPlan, LogLevel } from '../../shared/types.js'

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confirmed_by: { type: 'string' },
    role: { type: 'string' },
    room_available: { type: 'boolean' },
    room_number: { type: ['string', 'null'] },
    roll_in_shower: { type: ['boolean', 'null'] },
    bed_height_ok: { type: ['boolean', 'null'] },
    reference: { type: ['string', 'null'] },
    commitments: { type: 'array', items: { type: 'string' } },
    red_flags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'confirmed_by',
    'role',
    'room_available',
    'room_number',
    'roll_in_shower',
    'bed_height_ok',
    'reference',
    'commitments',
    'red_flags',
  ],
}

const SYSTEM = `Extrait de cette transcription d'appel téléphonique une confirmation structurée. JSON strict: {confirmed_by: string, role: string, room_available: bool, room_number: string|null, roll_in_shower: bool|null, bed_height_ok: bool|null, reference: string|null, commitments: [string], red_flags: [string]}. Si l'interlocuteur est évasif ou contradictoire, mets le point concerné à null et ajoute un red_flag.`

function log(agent: string, level: LogLevel, message: string): void {
  const entry = appendAgentLog({ agent, level, message })
  pushEvent('agent_log', entry)
}

function transcriptText(transcript: TranscriptChunk[]): string {
  return transcript
    .map((c) => `${c.speaker === 'assistant' ? 'IA' : 'Interlocuteur'}: ${c.text}`)
    .join('\n')
}

// Deterministic fallback: infer availability from keywords in the human turns.
function fallbackExtract(transcript: TranscriptChunk[]): Extracted {
  const human = transcript
    .filter((c) => c.speaker !== 'assistant')
    .map((c) => c.text.toLowerCase())
    .join(' ')
  const unavailable = /(réattribu|plus de chambre|plus de dispo|n'avons plus|non dispo)/.test(human)
  const evasive = /(voir avec|demain|je ne sais pas|je ne peux pas vous dire)/.test(human)
  const name = /mme laurent/.test(human)
    ? 'Mme Laurent'
    : evasive
      ? 'Interlocuteur (réception)'
      : 'Réception'

  if (unavailable) {
    return {
      confirmed_by: name,
      role: 'réception',
      room_available: false,
      room_number: null,
      roll_in_shower: null,
      bed_height_ok: null,
      reference: null,
      commitments: ['Un conseiller rappellera'],
      red_flags: ['Chambre 104 réattribuée — aucune chambre accessible disponible'],
    }
  }
  if (evasive) {
    return {
      confirmed_by: name,
      role: 'réception',
      room_available: null,
      room_number: null,
      roll_in_shower: null,
      bed_height_ok: null,
      reference: null,
      commitments: [],
      red_flags: ['Interlocuteur évasif — vérification reportée à demain'],
    }
  }
  return {
    confirmed_by: name,
    role: 'réception',
    room_available: true,
    room_number: '104',
    roll_in_shower: true,
    bed_height_ok: true,
    reference: 'BR-104-ACC',
    commitments: ['Chambre 104 maintenue'],
    red_flags: [],
  }
}

async function extract(
  transcript: TranscriptChunk[],
): Promise<{ data: Extracted; source: 'claude' | 'fallback'; error?: string }> {
  if (!claudeEnabled()) return { data: fallbackExtract(transcript), source: 'fallback' }
  try {
    const data = (await claudeJSON({
      system: SYSTEM,
      user: transcriptText(transcript),
      schema: EXTRACT_SCHEMA,
    })) as Extracted
    return { data, source: 'claude' }
  } catch (err) {
    return { data: fallbackExtract(transcript), source: 'fallback', error: (err as Error).message }
  }
}

// Pre-seeded recovery alternative used when s5 fails (spec Flow B).
function recoveryPlan(): ReplanPlan {
  return {
    at_risk: ['s5'],
    plan: [
      {
        stepId: 's5',
        action: 'Hôtel Aston — chambre accessible équivalente, douche italienne',
        new_time: '12/09 16:15',
        rationale: 'Chambre 104 indisponible — alternative accessible sécurisée',
      },
      {
        stepId: 's4',
        action: 'Taxi adapté re-routé vers Hôtel Aston',
        new_time: '12/09 15:55',
        rationale: 'Nouvelle destination hôtel',
      },
    ],
    message_voyageur:
      "La chambre initiale n'était plus disponible, mais une chambre accessible équivalente est déjà sécurisée à l'Hôtel Aston. Votre taxi est re-routé, rien à faire de votre côté.",
  }
}

// Run extraction on call end, store the full call in the ledger, and — if the
// room is not available — flip s5 to failed and propose the recovery plan.
export async function runExtractionAndRecover(transcript: TranscriptChunk[]): Promise<Extracted> {
  await reason(
    'extractor',
    [
      "Lecture de la transcription de l'appel.",
      "Extraction : disponibilité, interlocuteur, référence, signaux d'alerte.",
    ],
    { keepActive: true },
  )
  const { data, source } = await extract(transcript)
  think(
    'extractor',
    data.room_available === false
      ? 'Chambre NON disponible — signal rouge.'
      : data.room_available === null
        ? 'Réponse évasive — à re-confirmer.'
        : 'Chambre confirmée.',
  )
  agentActive('extractor', false)
  log(
    'extractor',
    'info',
    source === 'claude'
      ? 'Transcription analysée par Claude.'
      : 'Transcription analysée (mode hors ligne).',
  )

  // Archive the full call: transcript + extracted JSON.
  const entry = appendLedger({
    step: 's5',
    confirmed_by: data.confirmed_by,
    channel: 'appel IA',
    at: "aujourd'hui",
    ref: data.reference || 'BR-104-ACC',
    notes: `Appel re-confirmation — ${data.red_flags.length ? data.red_flags.join(' ; ') : 'chambre confirmée'}`,
    call: { transcript, extracted: data, audio: null },
  })
  pushEvent('ledger_entry', { entry })

  if (data.room_available === false) {
    setStepStatus('s5', 'failed', { reason: 'Chambre 104 réattribuée' })
    pushEvent('step_updated', { stepId: 's5', status: 'failed', reason: 'Chambre 104 réattribuée' })
    log('extractor', 'error', 'Chambre 104 indisponible — escalade déclenchée.')

    await reason('planner', [
      "Chambre 104 perdue — recherche d'une alternative accessible équivalente.",
      "Critère : douche à l'italienne obligatoire.",
      'Hôtel Aston identifié — chambre accessible conforme. Taxi re-routé.',
    ])
    const plan = recoveryPlan()
    setStepStatus('s5', 'failed', {})
    for (const item of plan.plan) {
      if (item.stepId === 's5') continue
      setStepStatus(item.stepId, 'at_risk', { reason: item.rationale })
      pushEvent('step_updated', { stepId: item.stepId, status: 'at_risk', reason: item.rationale })
    }
    const state = getState()
    state.replan = plan
    pushEvent('replan_proposed', { plan })
    log('planner', 'info', 'Plan de récupération proposé — Hôtel Aston. En attente de validation.')
  } else if (data.room_available === null) {
    setStepStatus('s5', 'at_risk', { reason: 'Réponse évasive — re-confirmation requise' })
    pushEvent('step_updated', {
      stepId: 's5',
      status: 'at_risk',
      reason: 'Réponse évasive — re-confirmation requise',
    })
    log('extractor', 'warn', 'Interlocuteur évasif — signalé, re-confirmation à programmer.')
  } else {
    setStepStatus('s5', 'reconfirmed', { reason: null })
    pushEvent('step_updated', { stepId: 's5', status: 'reconfirmed', reason: null })
    log('extractor', 'info', `Chambre confirmée par ${data.confirmed_by}. s5 re-confirmée.`)
  }

  pushEvent('call_status', { status: 'extracted', extracted: data })
  return data
}

export default { runExtractionAndRecover }
