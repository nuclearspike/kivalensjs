// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RangeRow, Component as PartnersRoute } from './Partners'
import { useLoanStore } from '../stores'

// Paul: "the partners route has the same types of sliders but doesn't have
// the buttons to open the modal." This pins the fix on the actual reported
// route — RangeExactControl.test.tsx covers the shared control's own
// behavior in depth; this file only needs to prove RangeRow renders it.

describe('Partners > RangeRow', () => {
  afterEach(cleanup)

  it('renders the exact-value button, matching the Search > Partner criteria tab', () => {
    render(
      <RangeRow label="Risk Rating (stars)" min={0} max={5} step={0.5} minVal={null} maxVal={null} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /set exact risk rating \(stars\) minimum and maximum/i })).toBeInTheDocument()
  })

  it('the button opens a centered modal wired to this row\'s onChange, using the hint as the modal help text', () => {
    const onChange = vi.fn()
    render(
      <RangeRow
        label="Risk Rating (stars)"
        hint="5 star = very low probability of collapse."
        min={0}
        max={5}
        step={0.5}
        minVal={2}
        maxVal={4}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /set exact/i }))

    expect(screen.getByRole('dialog').querySelector('.modal-dialog')).toHaveClass('modal-dialog-centered')
    expect(screen.getByText('5 star = very low probability of collapse.')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledWith(3, 4)
  })
})

describe('Partners route (the actual page, not just RangeRow in isolation)', () => {
  afterEach(cleanup)

  // The RangeRow-level tests above prove the component's own behavior; this
  // proves the ROUTE actually wires it up — the button exists on the page a
  // browser loads, and a click-through Apply flows all the way to the page's
  // own local filter state and back out to what the slider row displays. No
  // partner data needs to be seeded: the filter panel (including every
  // PARTNER_SLIDERS row) renders unconditionally, independent of whatever the
  // Kiva loans singleton has loaded.
  it('the route renders the button, and Apply updates the row\'s own displayed range', () => {
    useLoanStore.setState({ loans: [], downloading: false })
    render(
      <MemoryRouter initialEntries={['/partners']}>
        <PartnersRoute />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /set exact risk rating \(stars\) minimum and maximum/i }))

    const [minUnset, maxUnset] = screen.getAllByRole('checkbox', { name: 'not set' })
    fireEvent.click(minUnset)
    fireEvent.click(maxUnset)
    fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '2' } })
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    // Round-tripped through Partners' own `filters` state and back into
    // RangeRow's props — not just the modal's internal draft state.
    expect(screen.getByText('2 - 4')).toBeInTheDocument()
  })
})
