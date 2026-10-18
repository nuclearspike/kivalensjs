// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Teams from './Teams'
import { useUtilsStore } from '../stores'
import en from '../i18n/locales/en'
import { LenderTeams } from '../api/kivajs/LenderTeams'
import { req } from '../api/kivajs/req'
import { HttpStatusError } from '../api/kivajs/kivaBase'

afterEach(() => {
  cleanup()
  useUtilsStore.setState({ lenderModalOpen: false })
  vi.restoreAllMocks()
  delete (globalThis as { reportError?: unknown }).reportError
})

describe('Teams reports the failures it shows', () => {
  const collect = () => {
    const reported: string[] = []
    ;(globalThis as { reportError?: (e: unknown) => void }).reportError = (e) => reported.push((e as Error).message)
    return reported
  }

  it('a team graph Kiva would not give, shown in the chart pane and sent to the error collector', async () => {
    const reported = collect()
    vi.spyOn(LenderTeams.prototype, 'start').mockResolvedValue([{ id: 7, name: 'Team Seven' }] as never)
    vi.spyOn(req.kiva.ajax, 'get').mockRejectedValue(new HttpStatusError(502))
    useUtilsStore.setState({ lenderId: 'somelender' })
    render(<Teams />)
    fireEvent.click(await screen.findByLabelText('Team Seven'))
    await waitFor(() => expect(reported).toEqual(['Reading a team graph from Kiva failed: HTTP 502']))
    expect(screen.getByText('HTTP 502')).toBeInTheDocument()
  })

  it('the lender’s teams Kiva would not give', async () => {
    const reported = collect()
    vi.spyOn(LenderTeams.prototype, 'start').mockRejectedValue(new HttpStatusError(503))
    useUtilsStore.setState({ lenderId: 'somelender' })
    render(<Teams />)
    await waitFor(() => expect(reported).toEqual(["Reading the lender's teams from Kiva failed: HTTP 503"]))
  })
})

describe('Teams without a lender ID', () => {
  it('pitches what the ID unlocks instead of showing an error', () => {
    useUtilsStore.setState({ lenderId: '' })
    render(<Teams />)
    expect(screen.getByRole('heading', { name: en.pitch_teams_title })).toBeInTheDocument()
    expect(screen.getByText(en.pitch_teams_body)).toBeInTheDocument()
    expect(document.querySelector('.alert-danger')).toBeNull()
  })

  it('its button opens the lender-ID dialog', () => {
    useUtilsStore.setState({ lenderId: '' })
    render(<Teams />)
    fireEvent.click(screen.getByRole('button', { name: en.set_lender_id_2 }))
    expect(useUtilsStore.getState().lenderModalOpen).toBe(true)
  })
})
