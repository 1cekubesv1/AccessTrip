import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RealContext from './RealContext'
import type { ContextResponse } from '../../../shared/types'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubContext(body: ContextResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))),
  )
}

describe('RealContext', () => {
  it('renders SNCF regularity and Nice weather from /api/context', async () => {
    stubContext({
      ok: true,
      sncf: {
        axe: 'Sud-Est',
        month: '2026-05',
        regularite: 91.2,
        ponctualite: 88.7,
        source: 'SNCF Open Data',
        live: true,
      },
      weather: {
        tempC: 22,
        windKmh: 12,
        code: 3,
        label: 'Couvert',
        disruptive: false,
        source: 'Open-Meteo',
        live: true,
      },
    })
    render(<RealContext />)

    await waitFor(() => expect(screen.getByText('Contexte réel')).toBeInTheDocument())
    expect(screen.getByText('91.2%')).toBeInTheDocument()
    expect(screen.getByText(/Axe Sud-Est/)).toBeInTheDocument()
    expect(screen.getByText('données réelles SNCF')).toBeInTheDocument()
    expect(screen.getByText('22°C')).toBeInTheDocument()
    expect(screen.getByText(/Couvert/)).toBeInTheDocument()
  })

  it('renders nothing when the response is not ok', async () => {
    stubContext({ ok: false })
    const { container } = render(<RealContext />)
    // give the effect a tick; component should stay empty
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('degrades silently when the weather temp is unavailable', async () => {
    stubContext({
      ok: true,
      sncf: {
        axe: 'Sud-Est',
        month: null,
        regularite: 89.1,
        ponctualite: 88.6,
        source: 'SNCF (référence)',
        live: false,
      },
      weather: {
        tempC: null,
        windKmh: null,
        code: null,
        label: 'Indisponible',
        disruptive: false,
        source: 'Open-Meteo',
        live: false,
      },
    })
    render(<RealContext />)

    await waitFor(() => expect(screen.getByText('référence')).toBeInTheDocument())
    // weather block is skipped when tempC is null
    expect(screen.queryByText('Indisponible')).not.toBeInTheDocument()
  })
})
