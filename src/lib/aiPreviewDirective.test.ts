import { describe, expect, it } from 'vitest'
// analyze_loans only PREVIEWS a filter — it never changes the live search. The
// model learns that from the note in the tool result, so the note is behavior,
// not decoration. Regression: a user asked for "countries in the middle east
// with women who are oppressed"; the model ran analyze_loans, drew the chart,
// reported 17 matches — and never applied it, so the results never moved and the
// user had to follow up with "set the criteria".
import { execTool } from '../../server/aiChat.mjs'

const mkLoan = (o: Record<string, unknown>) => ({
  status: 'fundraising',
  funded_amount: 0,
  loan_amount: 1000,
  location: { country_code: 'JO', country: 'Jordan' },
  terms: { repayment_interval: 'monthly' },
  kls_tags: [],
  themes: [],
  borrower_count: 1,
  kl_percent_women: 100,
  kl_still_needed: 500,
  kl_percent_funded: 50,
  kl_name_arr: [],
  kls_use_or_descr_arr: [],
  kl_newest_sort: 0,
  posted_date: '2026-06-01',
  sector: 'Services',
  ...o,
})

const state = {
  batch: 1,
  ready: true,
  optionsGz: null,
  atheistListProcessed: true,
  activePartners: [{ id: 10, status: 'active', kl_regions: ['me'], kl_sp: [], countries: [{ iso_code: 'JO' }], rating: 5 }],
  allLoans: [
    mkLoan({ id: 1, partner_id: 10 }),
    mkLoan({ id: 2, partner_id: 10, sector: 'Retail' }),
    mkLoan({ id: 3, partner_id: 10, location: { country_code: 'PE', country: 'Peru' } }),
  ],
}

const emptyCriteria = () => ({ loan: {}, partner: {}, portfolio: {} })
const run = (args: Record<string, unknown>, applied = emptyCriteria()) =>
  execTool('analyze_loans', args, { state, lenderId: null, criteria: applied }, () => {})

describe('analyze_loans preview directive', () => {
  it('tells the model the search was NOT changed when it previews new criteria', async () => {
    const result = await run({ criteria: { loan: { country_code: 'JO' } } })
    expect(result.applied_to_search).toBe(false)
    // Must say it did not change the search, and demand set_criteria this turn.
    expect(result.note).toMatch(/did NOT change/i)
    expect(result.note).toContain('set_criteria')
    expect(result.note).toMatch(/THIS SAME TURN/i)
  })

  it('does not nag when the analysis matches the already-applied criteria', async () => {
    const applied = { loan: { country_code: 'JO' }, partner: {}, portfolio: {} }
    // Same filter, just asking for a breakdown of the current search.
    const result = await run({ criteria: { loan: { country_code: 'JO' } } }, applied)
    expect(result.applied_to_search).toBe(true)
    expect(result.note).not.toMatch(/did NOT change/i)
  })

  it('still counts correctly while previewing (count comes from the merged filter)', async () => {
    const result = await run({ criteria: { loan: { country_code: 'JO' } } })
    expect(result.count).toBe(2)
    expect(result.applied_to_search).toBe(false)
  })
})
