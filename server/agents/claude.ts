// Thin Claude Messages API client (raw fetch — no SDK dependency).
// Supports a custom base URL (e.g. an enterprise gateway) via ANTHROPIC_BASE_URL.
// Every agent that calls this MUST have a hardcoded fallback: the demo never breaks.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

// Auth headers: a direct API key uses x-api-key; a gateway / OAuth token (e.g.
// the Capgemini gateway) uses Authorization: Bearer + the oauth beta header.
export function authHeaders(): Record<string, string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return { 'x-api-key': process.env.ANTHROPIC_API_KEY }
  }
  return {
    Authorization: `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`,
    'anthropic-beta': 'oauth-2025-04-20',
  }
}

export function baseUrl(): string {
  return (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')
}

export interface ClaudeJSONArgs {
  system: string
  user: string
  schema: object
  maxTokens?: number
  timeoutMs?: number
}

// The Messages request body. `thinking` / `output_config` are current-API fields;
// we type our own request interface rather than fight a stale SDK type (this is a
// raw-fetch client, so no SDK types are involved).
export interface ClaudeRequestBody {
  model: string
  max_tokens: number
  thinking?: { type: string }
  output_config?: { format: { type: string; schema: object } }
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: unknown }>
}

// The relevant slice of the Messages response.
export interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>
}

// Call Claude and return parsed JSON matching `schema` (a JSON Schema object).
// Throws on any failure so callers can fall back deterministically.
export async function claudeJSON({
  system,
  user,
  schema,
  maxTokens = 1500,
  timeoutMs = 12000,
}: ClaudeJSONArgs): Promise<any> {
  if (!hasClaude()) throw new Error('ANTHROPIC_API_KEY not set')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const body: ClaudeRequestBody = {
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: user }],
    }
    const res = await fetch(`${baseUrl()}/v1/messages`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`Claude HTTP ${res.status}: ${await res.text().catch(() => '')}`)
    const data = (await res.json()) as ClaudeResponse
    const textBlock = (data.content || []).find((b) => b.type === 'text')
    if (!textBlock || !textBlock.text) throw new Error('No text block in Claude response')
    return JSON.parse(textBlock.text)
  } finally {
    clearTimeout(timer)
  }
}

export default { hasClaude, claudeJSON }
