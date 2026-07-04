import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Timeline, { StatusBadge } from './Timeline'
import type { Step, LedgerEntry } from '../../../shared/types'

const steps: Step[] = [
  {
    id: 's1',
    title: 'Assistance gare',
    provider: "Assist'enGare",
    when: '12/09 08:15',
    depends_on: [],
    status: 'reconfirmed',
    ref: 'AEG-1',
  },
  {
    id: 's2',
    title: 'TGV Paris → Nice',
    provider: 'SNCF',
    when: '12/09 09:03',
    depends_on: ['s1'],
    status: 'at_risk',
    ref: 'TGV-2',
    reason: 'météo',
  },
]

const ledger: LedgerEntry[] = [
  {
    step: 's1',
    confirmed_by: 'Mme Laurent',
    channel: 'appel IA',
    at: 'T-14j',
    ref: 'AEG-1',
    notes: 'ok',
  },
]

describe('StatusBadge', () => {
  it('renders the French label for a known status', () => {
    render(<StatusBadge status="reconfirmed" />)
    expect(screen.getByText('Re-confirmé')).toBeInTheDocument()
  })

  it('falls back to the raw status when unknown', () => {
    render(<StatusBadge status="mystery" />)
    expect(screen.getByText('mystery')).toBeInTheDocument()
  })
})

describe('Timeline', () => {
  it('renders one entry per step with title, meta and status badge', () => {
    render(<Timeline steps={steps} ledger={ledger} />)
    expect(screen.getByText('Assistance gare')).toBeInTheDocument()
    expect(screen.getByText('TGV Paris → Nice')).toBeInTheDocument()
    expect(screen.getByText('À risque')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows the receipt count for a step that has ledger entries', () => {
    render(<Timeline steps={steps} ledger={ledger} />)
    expect(screen.getByText('1 reçu(s)')).toBeInTheDocument()
  })

  it('surfaces the at-risk reason chip', () => {
    render(<Timeline steps={steps} ledger={ledger} />)
    expect(screen.getByText('⚠ météo')).toBeInTheDocument()
  })

  it('renders the receipt details for the confirmed step', () => {
    render(<Timeline steps={steps} ledger={ledger} />)
    const list = screen.getByRole('list')
    const firstItem = within(list).getAllByRole('listitem')[0]
    expect(within(firstItem).getByText('Mme Laurent')).toBeInTheDocument()
  })

  it('defaults ledger to empty (no receipts) when omitted', () => {
    render(<Timeline steps={steps} />)
    expect(screen.getAllByText(/Aucun reçu enregistré/).length).toBeGreaterThan(0)
  })
})
