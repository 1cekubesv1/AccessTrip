// Thin Claude Messages API client (raw fetch — no SDK dependency).
// Supports a custom base URL (e.g. an enterprise gateway) via ANTHROPIC_BASE_URL.
// Also supports a CLI bridge to real Claude (the local `claude` CLI) when no HTTP
// token is available. Every agent that calls this MUST have a hardcoded fallback:
// the demo never breaks.
import { execFile } from 'node:child_process'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

// Opt-in bridge to REAL Claude via the local `claude` CLI (Claude Code), used
// when no HTTP token is configured. Gated behind ANTHROPIC_VIA_CLI so the default
// demo stays fast + deterministic. Enable with ANTHROPIC_VIA_CLI=1.
export function hasClaudeCLI(): boolean {
  return /^(1|true|yes|on)$/i.test(process.env.ANTHROPIC_VIA_CLI || '')
}

// True when the agents can reach a real Claude — via HTTP token OR the CLI bridge.
// Agents gate on this (not hasClaude) so the CLI path is actually exercised.
export function claudeEnabled(): boolean {
  return hasClaude() || hasClaudeCLI()
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

// Pull the first JSON value out of a string that may be wrapped in prose or ``` fences.
function extractJSON(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced ? fenced[1] : text).trim()
  try {
    return JSON.parse(body)
  } catch {
    const start = body.search(/[[{]/)
    const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'))
    if (start === -1 || end <= start) throw new Error('No JSON found in CLI output')
    return JSON.parse(body.slice(start, end + 1))
  }
}

// Real Claude via the local `claude` CLI in print mode (`-p ... --output-format
// json`). Returns parsed JSON matching `schema`. Throws on any failure so callers
// fall back deterministically. Slower than HTTP (fresh process), so it carries a
// longer default timeout and is only reached when hasClaude() is false.
export function claudeCLIJSON({
  system,
  user,
  schema,
  timeoutMs = 45000,
}: ClaudeJSONArgs): Promise<any> {
  const prompt = [
    system,
    '',
    user,
    '',
    'Réponds UNIQUEMENT avec un objet JSON valide conforme à ce JSON Schema, sans texte ni balises autour :',
    JSON.stringify(schema),
  ].join('\n')

  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['-p', prompt, '--output-format', 'json'],
      { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`claude CLI: ${err.message} ${String(stderr).slice(0, 200)}`))
        }
        try {
          const envelope = JSON.parse(stdout)
          if (envelope && envelope.is_error) {
            throw new Error(`claude CLI error: ${envelope.result || 'unknown'}`)
          }
          const text = typeof envelope?.result === 'string' ? envelope.result : stdout
          resolve(extractJSON(text))
        } catch (e) {
          reject(e as Error)
        }
      },
    )
  })
}

// Call Claude and return parsed JSON matching `schema` (a JSON Schema object).
// Routes to HTTP when a token is set, else to the CLI bridge when enabled.
// Throws on any failure so callers can fall back deterministically.
export async function claudeJSON(args: ClaudeJSONArgs): Promise<any> {
  const { system, user, schema, maxTokens = 1500, timeoutMs = 12000 } = args

  if (!hasClaude()) {
    if (hasClaudeCLI()) return claudeCLIJSON(args)
    throw new Error('ANTHROPIC_API_KEY not set')
  }

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

export default { hasClaude, hasClaudeCLI, claudeEnabled, claudeJSON, claudeCLIJSON }
