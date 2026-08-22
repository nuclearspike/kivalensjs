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
  // A fully-loaded server: the live refresh has published full loan objects.
  // `ready` alone is the warm start, where allLoans holds unfilterable partials.
  rssReady: true,
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

describe('AI tools during the warm start', () => {
  // state.ready is true and allLoans holds PARTIAL detail objects that filter to
  // nothing. The tools must report "still loading", never "nothing matches" — in
  // production this told every user there were no loans for ~3 minutes after
  // each deploy.
  const warm = () => ({
    ...state,
    ready: true,
    rssReady: false,
    allLoans: [{ id: 1, description: { texts: { en: 'hi' } } }],
  })

  it('analyze_loans says loading, not “no loans match”', async () => {
    const r = await execTool('analyze_loans', { criteria: { loan: { country_code: 'KE' } } }, { state: warm(), lenderId: null, criteria: emptyCriteria() }, () => {})
    expect(r.ready).toBe(false)
    expect(r.note).toMatch(/still loading/i)
    expect(r.note).toMatch(/do NOT tell them nothing matches/i)
    expect(r.count).toBeUndefined()
  })

  it('set_criteria still applies the filter but reports no count yet', async () => {
    const r = await execTool('set_criteria', { criteria: { loan: { country_code: 'KE' } } }, { state: warm(), lenderId: null, criteria: emptyCriteria() }, () => {})
    expect(r.ok).toBe(true)
    expect(r.count).toBeNull() // NOT 0 — zero would read as “nothing matches”
    expect(r.note).toMatch(/do NOT say nothing matches/i)
  })

  it('reports a real count once the live data is published', async () => {
    const r = await execTool('set_criteria', { criteria: { loan: { country_code: 'JO' } } }, { state, lenderId: null, criteria: emptyCriteria() }, () => {})
    expect(r.count).toBeGreaterThan(0)
  })
})

describe('set_criteria — broadening guard', () => {
  // A user went 271 -> 243 -> 1,245 loans while ADDING filters and was told each
  // step had "narrowed" it. replace:true and empty-string clears both drop
  // filters silently, so the tool result has to call the widening out.
  const apply = (args: Record<string, unknown>, applied = emptyCriteria()) =>
    execTool('set_criteria', args, { state, lenderId: null, criteria: applied }, () => {})

  it('warns when a call makes the search broader', async () => {
    const narrow = { loan: { country_code: 'JO', sector: 'Services' }, partner: {}, portfolio: {} }
    // replace:true wipes the country filter, widening the result set.
    const r = await apply({ criteria: { loan: { sector: 'Services' } }, replace: true }, narrow)

    expect(r.count).toBeGreaterThan(r.countBefore)
    expect(r.note).toMatch(/BROADER, not narrower/)
    expect(r.note).toMatch(/NEVER call this "narrowed"/)
  })

  it('reports the before and after counts so the model can quote them', async () => {
    const narrow = { loan: { country_code: 'JO' }, partner: {}, portfolio: {} }
    const r = await apply({ criteria: {}, replace: true }, narrow)
    expect(r.note).toContain(`${r.countBefore} -> ${r.count}`)
  })

  it('stays quiet when the call actually narrows', async () => {
    const r = await apply({ criteria: { loan: { country_code: 'JO' } } })
    expect(r.count).toBeLessThanOrEqual(r.countBefore)
    expect(r.note).not.toMatch(/BROADER/)
  })

  it('stays quiet when nothing changed', async () => {
    const same = { loan: { country_code: 'JO' }, partner: {}, portfolio: {} }
    const r = await apply({ criteria: { loan: { country_code: 'JO' } } }, same)
    expect(r.note).not.toMatch(/BROADER/)
  })
})

describe('report_bug', () => {
  // Most users have no GitHub account, so this chat is the only channel they
  // have. The tool CALL is what makes the report machine-visible to the digest.
  const report = (args: Record<string, unknown>) =>
    execTool('report_bug', args, { state, lenderId: null, criteria: emptyCriteria() }, () => {})

  it('records what the user described', async () => {
    const r = await report({
      summary: 'saved searches vanished',
      expected: 'my 6 searches',
      actual: 'the list is empty',
      where: 'Saved page',
    })
    expect(r.ok).toBe(true)
    expect(r.recorded).toMatchObject({
      summary: 'saved searches vanished',
      actual: 'the list is empty',
      where: 'Saved page',
    })
  })

  it('accepts a partial report rather than demanding every field', async () => {
    const r = await report({ summary: 'basket keeps emptying' })
    expect(r.ok).toBe(true)
    expect(r.recorded.summary).toBe('basket keeps emptying')
  })

  it('asks for one detail instead of filing an empty report', async () => {
    const r = await report({})
    expect(r.ok).toBeUndefined()
    expect(r.error).toBe('summary_required')
  })

  it('tells the model to confirm receipt WITHOUT promising a fix or a timeline', async () => {
    const r = await report({ summary: 'x' })
    expect(r.note).toMatch(/do NOT\s+promise a fix or a timeline/i)
    expect(r.note).toMatch(/not ask them to file it anywhere else/i)
  })

  it('clips hostile-length input so one report cannot bloat the digest', async () => {
    const r = await report({ summary: 'x'.repeat(5000), actual: 'y'.repeat(5000) })
    expect(r.recorded.summary.length).toBeLessThanOrEqual(300)
    expect(r.recorded.actual.length).toBeLessThanOrEqual(300)
  })
})

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
