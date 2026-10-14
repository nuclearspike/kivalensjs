// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Partner } from '../types'
import PartnerDetail from './PartnerDetail'

afterEach(cleanup)

const partner = (url: string): Partner => ({
  id: 1, name: 'Example Partner', status: 'active', countries: [], start_date: '2020-01-01', url,
})

describe('partner website link', () => {
  it('does not make a script URL from partner data clickable', () => {
    render(<MemoryRouter><PartnerDetail partner={partner('javascript:alert(1)')} /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).toBeNull()
  })

  it('keeps a normal HTTPS partner website available', () => {
    render(<MemoryRouter><PartnerDetail partner={partner('https://partner.example/about')} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'https://partner.example/about' })).toHaveAttribute('href', 'https://partner.example/about')
  })
})
