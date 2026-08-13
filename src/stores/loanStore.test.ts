/**
 * The basket holds real money the user is about to send to Kiva, so its
 * arithmetic and de-duplication are the highest-consequence logic in the client:
 * a double entry double-charges, and an amount above what a loan still needs is
 * rejected at checkout.
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { useLoanStore } from './loanStore'
import { createKivaLoans } from '../api/kiva'
import type { KivaLoan } from '../types'

const store = () => useLoanStore.getState()

const mk = (id: number, extra: Partial<KivaLoan> = {}) =>
  ({
    id,
    name: `Borrower ${id}`,
    status: 'fundraising',
    loan_amount: 1000,
    funded_amount: 0,
    basket_amount: 0,
    sector: 'Agriculture',
    activity: 'Farming',
    use: 'seed',
    location: { country_code: 'KE', country: 'Kenya' },
    terms: { repayment_interval: 'monthly' },
    kls_tags: [],
    themes: [],
    borrowers: [],
    kl_percent_women: 100,
    kl_still_needed: 500,
    kl_percent_funded: 50,
    kl_name_arr: [],
    kls_use_or_descr_arr: [],
    kl_newest_sort: 0,
    posted_date: '2026-06-01',
    kl_processed: new Date(),
    ...extra,
  }) as unknown as KivaLoan

/** getBasket()/adjust* resolve loans through the global Loans singleton. */
const seedLoans = (loans: KivaLoan[]) => createKivaLoans().setKivaLoans(loans, true, true)

beforeEach(() => {
  store().clearBasket()
  store().clearPendingCheckout()
})

describe('basket — adding', () => {
  it('defaults a new entry to $25', () => {
    store().addToBasket(1)
    expect(store().basket).toEqual([{ loan_id: 1, amount: 25 }])
  })

  it('honours an explicit amount', () => {
    store().addToBasket(1, 100)
    expect(store().basket[0].amount).toBe(100)
  })

  it('never adds the same loan twice (and keeps the original amount)', () => {
    store().addToBasket(1, 50)
    store().addToBasket(1, 999)
    expect(store().basket).toHaveLength(1)
    expect(store().basket[0].amount).toBe(50)
  })

  it('batch-add de-dupes against what is already in the basket', () => {
    store().addToBasket(1, 25)
    store().batchAddToBasket([
      { loan_id: 1, amount: 75 },
      { loan_id: 2, amount: 50 },
    ])
    expect(store().basket.map((b) => b.loan_id)).toEqual([1, 2])
    expect(store().basket.find((b) => b.loan_id === 1)!.amount).toBe(25)
  })

  it('batch-add de-dupes WITHIN its own payload', () => {
    store().batchAddToBasket([
      { loan_id: 7, amount: 25 },
      { loan_id: 7, amount: 25 },
      { loan_id: 8, amount: 25 },
    ])
    expect(store().basket.map((b) => b.loan_id)).toEqual([7, 8])
  })

  it('ignores an empty batch', () => {
    store().addToBasket(1)
    store().batchAddToBasket([])
    expect(store().basket).toHaveLength(1)
  })
})

describe('basket — removing and clearing', () => {
  it('removes one loan and leaves the rest', () => {
    store().batchAddToBasket([{ loan_id: 1, amount: 25 }, { loan_id: 2, amount: 25 }])
    store().removeFromBasket(1)
    expect(store().basket.map((b) => b.loan_id)).toEqual([2])
  })

  it('removing a loan that is not there is a no-op', () => {
    store().addToBasket(1)
    store().removeFromBasket(999)
    expect(store().basket).toHaveLength(1)
  })

  it('batch-removes several at once', () => {
    store().batchAddToBasket([1, 2, 3].map((id) => ({ loan_id: id, amount: 25 })))
    store().batchRemoveFromBasket([1, 3])
    expect(store().basket.map((b) => b.loan_id)).toEqual([2])
  })

  it('clears everything', () => {
    store().batchAddToBasket([1, 2].map((id) => ({ loan_id: id, amount: 25 })))
    store().clearBasket()
    expect(store().basket).toEqual([])
  })
})

describe('basket — amounts', () => {
  it('sets one loan’s amount', () => {
    store().addToBasket(1, 25)
    store().setBasketAmount(1, 175)
    expect(store().basket[0].amount).toBe(175)
  })

  it('setting an amount for a loan not in the basket does not create one', () => {
    store().setBasketAmount(42, 100)
    expect(store().basket).toEqual([])
  })

  it('sets every amount at once', () => {
    store().batchAddToBasket([1, 2, 3].map((id) => ({ loan_id: id, amount: 25 })))
    store().setAllBasketAmounts(50)
    expect(store().basket.every((b) => b.amount === 50)).toBe(true)
  })
})

describe('basket — adjustBasketAmountsToWhatsLeft', () => {
  it('caps an amount to what the loan still needs', () => {
    seedLoans([mk(1, { kl_still_needed: 75 })])
    store().addToBasket(1, 200)
    store().adjustBasketAmountsToWhatsLeft()
    expect(store().basket[0].amount).toBe(75)
  })

  it('leaves an amount already within what is needed', () => {
    seedLoans([mk(1, { kl_still_needed: 500 })])
    store().addToBasket(1, 50)
    store().adjustBasketAmountsToWhatsLeft()
    expect(store().basket[0].amount).toBe(50)
  })

  it('drops a loan that no longer needs anything', () => {
    seedLoans([mk(1, { kl_still_needed: 0 }), mk(2, { kl_still_needed: 300 })])
    store().batchAddToBasket([{ loan_id: 1, amount: 25 }, { loan_id: 2, amount: 25 }])
    store().adjustBasketAmountsToWhatsLeft()
    expect(store().basket.map((b) => b.loan_id)).toEqual([2])
  })

  it('drops a loan that stopped fundraising', () => {
    seedLoans([mk(1, { status: 'funded', kl_still_needed: 100 }), mk(2)])
    store().batchAddToBasket([{ loan_id: 1, amount: 25 }, { loan_id: 2, amount: 25 }])
    store().adjustBasketAmountsToWhatsLeft()
    expect(store().basket.map((b) => b.loan_id)).toEqual([2])
  })
})

describe('basket — queries', () => {
  it('inBasket reflects membership', () => {
    store().addToBasket(5)
    expect(store().inBasket(5)).toBe(true)
    expect(store().inBasket(6)).toBe(false)
  })

  it('getBasket joins amounts to loans and skips ones not loaded', () => {
    seedLoans([mk(1)])
    store().batchAddToBasket([{ loan_id: 1, amount: 25 }, { loan_id: 404, amount: 25 }])
    const entries = store().getBasket()
    expect(entries.map((e) => e.id)).toEqual([1])
    expect(entries[0].loan!.id).toBe(1)
  })
})

describe('checkout hand-off', () => {
  it('records the ids being checked out, then clears them', () => {
    store().beginCheckout([1, 2])
    expect(store().pendingCheckout!.ids).toEqual([1, 2])
    store().clearPendingCheckout()
    expect(store().pendingCheckout).toBeNull()
  })
})
