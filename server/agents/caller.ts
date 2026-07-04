// Caller agent (M3): triggers the re-confirmation phone call for step s5.
// Two paths — a real Vapi call when keys are set, or an offline simulation that
// pushes scripted transcript chunks through the same SSE pipeline so Flow B is
// demoable without a phone. Either way the CallPanel renders identical bubbles.
import { getState, updateState, appendAgentLog } from '../state.js'
import { pushEvent } from '../events.js'
import { runExtractionAndRecover } from './extractor.js'
import { agentActive, think } from './trace.js'
import type { CallState, TranscriptChunk, LogLevel } from '../../shared/types.js'

export function hasVapi(): boolean {
  return Boolean(
    process.env.VAPI_API_KEY &&
    process.env.VAPI_PHONE_NUMBER_ID &&
    process.env.VAPI_ASSISTANT_ID &&
    process.env.RECEPTIONIST_PHONE,
  )
}

function log(agent: string, level: LogLevel, message: string): void {
  const entry = appendAgentLog({ agent, level, message })
  pushEvent('agent_log', entry)
}

function setCall(patch: Partial<CallState>): void {
  updateState((s) => {
    s.call = { ...s.call, ...patch }
  })
  pushEvent('call_status', patch)
}

function pushChunk(speaker: TranscriptChunk['speaker'], text: string): void {
  const chunk: TranscriptChunk = { speaker, text }
  updateState((s) => {
    s.transcript.push(chunk)
  })
  pushEvent('transcript_chunk', chunk)
}

// The provider + accommodation a call is about. Injected into the single live
// Vapi assistant per call via assistantOverrides.variableValues (the {{callContext}}
// placeholder in its prompt), so one assistant handles both the airport and the
// hotel without separate assistant IDs.
type CallTarget = { provider: string; ask: string; details: string }

const TARGETS: Record<'hotel' | 'airport', CallTarget> = {
  hotel: {
    provider: 'Hôtel Beau Rivage',
    ask: "une chambre accessible avec douche à l'italienne (roll-in shower)",
    details: 'Chambre 104, référence BR-104-ACC, séjour du 12 septembre.',
  },
  airport: {
    provider: "l'assistance PMR de l'aéroport (Paris CDG puis Nice)",
    ask: "l'assistance à l'embarquement et au débarquement en fauteuil roulant (WCHC)",
    details: 'Vol Paris → Nice, fauteuil roulant électrique Permobil M3.',
  },
}

function callContextFor(t: CallTarget): string {
  return [
    `Prestataire appelé : ${t.provider}.`,
    `Objectif : confirmer ${t.ask}.`,
    `Détails : ${t.details}`,
    'Voyageuse : Camille Moreau. Obtiens une confirmation claire et, si possible,' +
      " le nom de l'interlocuteur et une référence.",
  ].join(' ')
}

// Start a call. `target` selects which provider/accommodation the live assistant
// is briefed on; `branch` selects the simulated scenario when there is no Vapi:
// 'B1' happy, 'B2' room-unavailable (the stage branch), 'B3' evasive.
export async function startCall({
  target = 'hotel',
  branch = 'B2',
}: { target?: 'hotel' | 'airport'; branch?: string } = {}) {
  const t = TARGETS[target] ?? TARGETS.hotel
  updateState((s) => {
    s.transcript = []
    s.metrics.callsMade += 1
  })
  pushEvent('metrics', getState().metrics)
  setCall({ status: 'dialing', id: null, mode: hasVapi() ? 'vapi' : 'simulation', branch })
  agentActive('caller', true)
  think('caller', `Composition du numéro du prestataire (${t.provider}).`)
  think('caller', `Objectif : confirmer ${t.ask}.`)
  log('caller', 'info', `Appel lancé — ${t.provider} · ${t.details}`)

  if (hasVapi()) return startVapiCall(t)
  return simulateCall(branch)
}

async function startVapiCall(target: CallTarget) {
  try {
    const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '')
    const assistantOverrides = {
      variableValues: { callContext: callContextFor(target) },
      ...(publicUrl ? { serverUrl: `${publicUrl}/webhooks/vapi` } : {}),
    }
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        assistantId: process.env.VAPI_ASSISTANT_ID,
        customer: { number: process.env.RECEPTIONIST_PHONE },
        assistantOverrides,
      }),
    })
    if (!res.ok) throw new Error(`Vapi HTTP ${res.status}: ${await res.text().catch(() => '')}`)
    const data = (await res.json()) as { id?: string }
    setCall({ status: 'ringing', id: data.id || null })
    log('caller', 'info', 'Le téléphone sonne… transcription en direct via webhook.')
    return { mode: 'vapi', id: data.id }
  } catch (err) {
    log('caller', 'error', `Échec Vapi (${(err as Error).message}). Bascule en simulation.`)
    return simulateCall('B2')
  }
}

// Scripted branches (teammate receptionist). Delays make it read like a real call.
const SCRIPTS: Record<string, Array<[TranscriptChunk['speaker'], string]>> = {
  B1: [
    [
      'assistant',
      "Bonjour, ici l'assistante vocale d'AccessTrip pour Mme Camille Moreau. Cet appel est enregistré. Je confirme la chambre 104 accessible pour le 12 septembre ?",
    ],
    ['human', "Oui bonjour, alors… la 104, douche à l'italienne, c'est bien réservé."],
    ['assistant', 'Parfait. Puis-je avoir votre nom pour notre registre ?'],
    ['human', 'Mme Laurent, à la réception.'],
    ['assistant', 'Merci Mme Laurent. Chambre 104 confirmée, référence BR-104-ACC. Bonne journée.'],
  ],
  B2: [
    [
      'assistant',
      "Bonjour, ici l'assistante vocale d'AccessTrip pour Mme Camille Moreau. Cet appel est enregistré. Je confirme la chambre 104 accessible pour le 12 septembre ?",
    ],
    [
      'human',
      "Ah… alors justement, la 104 a été réattribuée. Nous n'avons plus de chambre accessible ce soir-là.",
    ],
    [
      'assistant',
      "Je comprends. Existe-t-il une alternative accessible avec douche à l'italienne ?",
    ],
    ['human', 'Non, désolée, rien de disponible chez nous ce soir-là.'],
    [
      'assistant',
      'Merci de votre franchise. Un conseiller va rappeler pour organiser une solution. Bonne journée.',
    ],
  ],
  B3: [
    [
      'assistant',
      "Bonjour, ici l'assistante vocale d'AccessTrip pour Mme Camille Moreau. Cet appel est enregistré. Je confirme la chambre 104 accessible pour le 12 septembre ?",
    ],
    ['human', 'Euh… il faudrait voir avec ma collègue demain, je ne peux pas vous dire là.'],
    [
      'assistant',
      "Très bien. Pouvez-vous confirmer si la chambre est accessible avec douche à l'italienne ?",
    ],
    ['human', 'Je ne sais pas, franchement il faut voir demain.'],
    ['assistant', 'Compris. Un conseiller rappellera. Merci, bonne journée.'],
  ],
}

async function simulateCall(branch: string) {
  const script = SCRIPTS[branch] || SCRIPTS.B2
  setCall({ status: 'in_progress', id: `sim-${branch}` })
  log('caller', 'info', 'Appel simulé (mode hors ligne) — bulles en direct.')

  // stream chunks with realistic gaps
  for (const [speaker, text] of script) {
    await delay(1100)
    pushChunk(speaker, text)
  }
  await delay(900)
  setCall({ status: 'ended' })
  agentActive('caller', false)
  log('caller', 'info', 'Appel terminé — extraction de la confirmation…')

  // hand off to the extractor + recovery (M4)
  const transcript = getState().transcript
  await runExtractionAndRecover(transcript)
  return { mode: 'simulation', branch }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export default { startCall, hasVapi }
