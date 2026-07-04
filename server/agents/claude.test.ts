import { describe, it, expect, afterEach, vi } from 'vitest'
import { hasClaude, hasClaudeCLI, claudeEnabled, authHeaders, baseUrl } from './claude'

// hasClaude/authHeaders/baseUrl read env at call time, so stubEnv is enough — no
// module reload needed. Clear all stubbed vars after each test.
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('hasClaude', () => {
  it('is true when an API key is set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '')
    expect(hasClaude()).toBe(true)
  })

  it('is true when only an auth token is set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'oauth-token')
    expect(hasClaude()).toBe(true)
  })

  it('is false when neither is set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '')
    expect(hasClaude()).toBe(false)
  })
})

describe('hasClaudeCLI', () => {
  it('is true when ANTHROPIC_VIA_CLI is truthy (1/true/on)', () => {
    for (const v of ['1', 'true', 'yes', 'on', 'TRUE']) {
      vi.stubEnv('ANTHROPIC_VIA_CLI', v)
      expect(hasClaudeCLI()).toBe(true)
    }
  })

  it('is false when unset or falsy', () => {
    vi.stubEnv('ANTHROPIC_VIA_CLI', '')
    expect(hasClaudeCLI()).toBe(false)
    vi.stubEnv('ANTHROPIC_VIA_CLI', '0')
    expect(hasClaudeCLI()).toBe(false)
  })
})

describe('claudeEnabled', () => {
  it('is true via HTTP token', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    vi.stubEnv('ANTHROPIC_VIA_CLI', '')
    expect(claudeEnabled()).toBe(true)
  })

  it('is true via the CLI bridge alone', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '')
    vi.stubEnv('ANTHROPIC_VIA_CLI', '1')
    expect(claudeEnabled()).toBe(true)
  })

  it('is false with no token and no CLI flag', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '')
    vi.stubEnv('ANTHROPIC_VIA_CLI', '')
    expect(claudeEnabled()).toBe(false)
  })
})

describe('authHeaders', () => {
  it('uses x-api-key for a direct API key', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-direct')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '')
    expect(authHeaders()).toEqual({ 'x-api-key': 'sk-direct' })
  })

  it('uses Bearer + oauth beta header for a gateway token', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'gw-token')
    expect(authHeaders()).toEqual({
      Authorization: 'Bearer gw-token',
      'anthropic-beta': 'oauth-2025-04-20',
    })
  })

  it('prefers the API key when both are present', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-direct')
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', 'gw-token')
    expect(authHeaders()).toEqual({ 'x-api-key': 'sk-direct' })
  })
})

describe('baseUrl', () => {
  it('defaults to the public API', () => {
    vi.stubEnv('ANTHROPIC_BASE_URL', '')
    expect(baseUrl()).toBe('https://api.anthropic.com')
  })

  it('honours a custom base URL and strips a trailing slash', () => {
    vi.stubEnv('ANTHROPIC_BASE_URL', 'https://gateway.example.com/')
    expect(baseUrl()).toBe('https://gateway.example.com')
  })
})
