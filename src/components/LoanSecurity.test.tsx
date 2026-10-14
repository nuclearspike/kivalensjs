// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from '../i18n'
import { getKivaLoans } from '../api/kiva'
import { useLoanStore } from '../stores'
import type { KivaLoan } from '../types'
import Loan from './Loan'

const kl = getKivaLoans()
const originalLoans = kl.indexedLoans
const originalFetch = kl.fetchDescrAndRepayments

afterEach(() => {
  cleanup()
  kl.indexedLoans = originalLoans
  kl.fetchDescrAndRepayments = originalFetch
  useLoanStore.setState({ loans: [], filteredLoans: [], basket: [] })
  localStorage.removeItem('loan_active_tab')
})

describe('loan detail from Kiva', () => {
  it('shows the borrower story without turning external HTML into active content', () => {
    localStorage.setItem('loan_active_tab', '2')
    const loan = {
      id: 77, name: 'Security fixture', status: 'fundraising', partner_id: null,
      sector: 'Retail', activity: 'Retail', use: 'Business supplies',
      location: { country: 'Kenya', country_code: 'KE' }, image: { id: 1 }, borrowers: [],
      description: { languages: ['en'], texts: { en: '<p>Hello <strong>lender</strong><img src=x onerror="window.pwned=1"></p><svg onload="window.pwned=1"></svg><a href="javascript:alert(1)">read more</a>' } },
      terms: {}, loan_amount: 500, funded_amount: 0, basket_amount: 0, kl_still_needed: 500,
    } as unknown as KivaLoan
    kl.indexedLoans = { 77: loan }
    kl.fetchDescrAndRepayments = vi.fn(async () => {}) as typeof kl.fetchDescrAndRepayments
    useLoanStore.setState({ loans: [loan], filteredLoans: [loan], downloading: false })

    const { container } = render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/loans/77']}>
          <Routes><Route path="/loans/:id" element={<Loan />} /></Routes>
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { name: /Security fixture/ })).toBeInTheDocument()
    expect(screen.getByText('lender', { selector: '.loan-description strong' })).toBeInTheDocument()
    expect(container.querySelector('.loan-description img, .loan-description svg, .loan-description a')).toBeNull()
    expect(container.querySelector('.loan-description')).toHaveTextContent('read more')
  })
})
