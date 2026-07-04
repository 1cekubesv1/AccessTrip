// Vision agent (M5): compares an uploaded photo against Camille's functional needs
// and returns an accessibility verdict with confidence + an evidence quote.
// Uses Claude vision when available; deterministic fallback keeps the demo alive.
import { getState, updateState } from '../state.js'
import { pushEvent } from '../events.js'
import { hasClaude, authHeaders, baseUrl, type ClaudeResponse } from './claude.js'
import { reason, agentActive, think } from './trace.js'
import type { VisionVerdict } from '../../shared/types.js'

export interface ImageInput {
  base64?: string
  mediaType?: string
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    conforme: { type: 'boolean' },
    confiance: { type: 'number' },
    critere: { type: 'string' },
    preuve: { type: 'string' },
    recommandation: { type: 'string' },
  },
  required: ['conforme', 'confiance', 'critere', 'preuve', 'recommandation'],
}

const SYSTEM = `Tu es l'agent de vérification visuelle d'AccessTrip. Compare la photo au besoin d'accessibilité du voyageur (notamment: douche à l'italienne / roll-in, sans ressaut, accès de plain-pied). Réponds en JSON strict: {conforme: bool, confiance: number (0-1), critere: string, preuve: string (citation de ce que tu observes), recommandation: string}. Sois factuel et prudent.`

// Pre-seeded fallback verdict — the spec's shower-lip example.
function fallbackVerdict(): VisionVerdict {
  return {
    conforme: false,
    confiance: 0.82,
    critere: "Douche à l'italienne (roll-in)",
    preuve: 'Ressaut de douche estimé à ~15 cm — un rebord est visible au seuil du bac.',
    recommandation:
      "Non conforme à une douche à l'italienne. Signalé à l'hôtel : exiger un accès de plain-pied ou une rampe amovible validée.",
  }
}

// image: { base64, mediaType }. Returns and broadcasts the verdict.
export async function checkPhoto(image: ImageInput | null): Promise<VisionVerdict> {
  let verdict: VisionVerdict
  let source = 'fallback'

  await reason(
    'vision',
    [
      'Analyse de la photo fournie.',
      "Comparaison au besoin : douche à l'italienne, accès de plain-pied.",
    ],
    { keepActive: true },
  )

  if (hasClaude() && image?.base64) {
    try {
      verdict = await claudeVision(image)
      source = 'claude'
    } catch {
      verdict = fallbackVerdict()
    }
  } else {
    verdict = fallbackVerdict()
  }

  think(
    'vision',
    verdict.conforme ? "Conforme au besoin d'accessibilité." : `Non conforme : ${verdict.preuve}`,
  )
  agentActive('vision', false)
  updateState((s) => {
    s.visionVerdict = { ...verdict, source }
  })
  pushEvent('vision_verdict', { verdict: { ...verdict, source } })
  pushEvent('agent_log', {
    agent: 'vision',
    level: verdict.conforme ? 'info' : 'warn',
    message: `Vérification visuelle : ${verdict.conforme ? 'conforme' : 'NON conforme'} — ${verdict.critere}.`,
  })
  return { ...verdict, source }
}

// Direct Claude vision call (raw fetch, base64 image + JSON schema output).
async function claudeVision(image: ImageInput): Promise<VisionVerdict> {
  const needs = getState().traveler.profile_functional_needs
  const res = await fetch(`${baseUrl()}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...authHeaders(),
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
      max_tokens: 1000,
      output_config: { format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mediaType || 'image/jpeg',
                data: image.base64,
              },
            },
            {
              type: 'text',
              text: `Besoins fonctionnels du voyageur : ${needs.join(' ; ')}. Cette photo est-elle conforme ?`,
            },
          ],
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Claude vision HTTP ${res.status}`)
  const data = (await res.json()) as ClaudeResponse
  const textBlock = (data.content || []).find((b) => b.type === 'text')
  if (!textBlock || !textBlock.text) throw new Error('No text block in Claude vision response')
  return JSON.parse(textBlock.text) as VisionVerdict
}

export default { checkPhoto }
