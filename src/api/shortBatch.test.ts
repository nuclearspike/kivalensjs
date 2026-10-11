/**
 * On 2026-10-10 the server published a batch in which 200 of 6,709 loans had come
 * without their details (Kiva had not answered four detail requests). One such
 * loan made the page give up the whole batch and fetch every loan from Kiva,
 * which takes minutes, so every visitor had the slow load until the next batch.
 *
 * A loan the page cannot use costs only itself: the rest of the batch loads at
 * once, and Kiva is asked for the loans left out.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createKivaLoans, type Loans, type NotifyMessage } from './kiva'
import { LoanWithoutDetails, ResultProcessors } from './kivajs/ResultProcessors'

/** A loan as the server's batch carries it (compressLoan in server/klCore.mjs). */
const served = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Borrower ${id}`,
  image: { id: 6360988 },
  activity: 'Farming',
  sector: 'Agriculture',
  use: 'to buy seed.',
  location: { country_code: 'KE', country: 'Kenya' },
  partner_id: 10,
  posted_date: '2026-10-01T07:10:32Z',
  planned_expiration_date: '2026-11-05T08:10:32Z',
  loan_amount: 1000,
  terms: { disbursal_date: '2026-09-14T07:00:00Z', repayment_interval: 'Monthly', loss_liability: { nonpayment: 'lender', currency_exchange: 'lender' } },
  kls_has_descr: true,
  kls_half_back: '2027-03-01T00:00:00.000Z',
  kls_half_back_actual: 50,
  kls_75_back: '2027-06-01T00:00:00.000Z',
  kls_75_back_actual: 75,
  kls_final_repayment: '2027-09-01T07:00:00.000Z',
  kls_repaid_in: 11,
  klb: { F: 1 },
  kls: true,
  ...extra,
})

/** A loan as the server sent it that day when its details had not arrived: field for field from batch 12571. */
const withoutDetails = (id: number) => ({
  id,
  name: `Borrower ${id}`,
  image: { id: 6335738 },
  activity: 'Retail',
  sector: 'Retail',
  use: 'buy cleaning products to build up her inventory.',
  location: { country_code: 'NI', country: 'Nicaragua' },
  partner_id: 10,
  posted_date: '2026-10-05T16:53:53Z',
  planned_expiration_date: '2026-11-09T17:53:53Z',
  loan_amount: 1000,
  bonus_credit_eligibility: true,
  kls_tags: ['#Parent'],
  kls_has_descr: false,
  klb: {},
  kls: true,
})

/** Kiva's own answer for a loan (api.kivaws.org/v1/loans/<ids>.json). */
const fromKiva = (id: number) => ({
  id,
  name: `Borrower ${id}`,
  status: 'fundraising',
  funded_amount: 100,
  basket_amount: 0,
  loan_amount: 1000,
  posted_date: '2026-10-05T16:53:53Z',
  planned_expiration_date: '2026-11-09T17:53:53Z',
  sector: 'Retail',
  activity: 'Retail',
  use: 'buy cleaning products to build up her inventory.',
  location: { country_code: 'NI', country: 'Nicaragua' },
  partner_id: 10,
  description: { languages: ['en'], texts: { en: 'She sells soap from her house.' } },
  terms: {
    disbursal_date: '2026-09-20T07:00:00Z',
    repayment_interval: 'Monthly',
    scheduled_payments: [
      { due_date: '2027-01-01T08:00:00Z', amount: 500 },
      { due_date: '2027-02-01T08:00:00Z', amount: 500 },
    ],
    local_payments: [],
    loss_liability: { nonpayment: 'lender', currency_exchange: 'lender' },
  },
  borrowers: [{ first_name: 'Alondra', last_name: '', gender: 'F' }],
  tags: [],
})

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as unknown as Response

/** The KivaLens server and Kiva, as far as a catalog load reaches them. */
function fakeNetwork(pages: unknown[][], kivaRefuses: (ids: number[]) => boolean = () => false) {
  const asked: string[] = []
  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    asked.push(url)
    if (url.endsWith('/api/start')) return ok({ batch: 7, pages: pages.length, loanLengths: pages.map(() => 1000), descrLengths: pages.map(() => 100), builtAt: Date.now() })
    if (url.includes('/api/partners')) return ok([{ id: 10, name: 'Test MFI', status: 'active', countries: [{ iso_code: 'KE', region: 'Africa' }], start_date: '2010-01-01T00:00:00Z' }])
    let m
    if ((m = /\/api\/loans\/7\/keywords\/(\d+)/.exec(url))) return ok((pages[Number(m[1]) - 1] as Array<{ id: number }>).filter((l) => l && typeof l === 'object').map((l) => ({ id: l.id, t: ['SEED'] })))
    if ((m = /\/api\/loans\/7\/(\d+)/.exec(url))) return ok(pages[Number(m[1]) - 1])
    if (url.includes('/api/since/7')) return ok([])
    if ((m = /api\.kivaws\.org\/v1\/loans\/([\d,]+)\.json/.exec(url))) {
      const wanted = m[1].split(',').map(Number)
      // Kiva answers a request holding one id it does not know with an error for the whole request.
      if (kivaRefuses(wanted)) return { ok: false, status: 404, json: async () => ({ message: 'Invalid loan ID' }), text: async () => '' } as unknown as Response
      return ok({ loans: wanted.map(fromKiva) })
    }
    if (url.includes('loans/search.json')) return ok({ paging: { page: 1, pages: 1, total: 0 }, loans: [] })
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as unknown as Response
  })
  return { fetchStub, asked }
}

let kl: Loans
let reported: Error[]
let originalFetch: typeof globalThis.fetch
const ids = () => kl.loansFromKiva.map((l) => l.id).sort((a, b) => a - b)

/** Starts a catalog load and resolves with what the page was told, in order. */
function load(fetchStub: typeof globalThis.fetch) {
  globalThis.fetch = fetchStub
  kl = createKivaLoans()
  const heard: NotifyMessage[] = []
  // What the catalog held at the moment each new_loans was announced.
  const whenAnnounced: number[][] = []
  kl.onNotify((msg) => {
    heard.push(msg)
    if (msg.new_loans) whenAnnounced.push(kl.loansFromKiva.map((l) => l.id).sort((a, b) => a - b))
  })
  void kl.init({}, () => ({ mergeAtheistList: false }), { maxConcurrent: 8 })
  const until = (what: (msg: NotifyMessage) => unknown) => vi.waitFor(() => expect(heard.some((m) => what(m))).toBe(true), { timeout: 4000 })
  return { heard, until, whenAnnounced }
}

beforeEach(() => {
  originalFetch = globalThis.fetch
  reported = []
  ;(globalThis as { reportError?: (e: unknown) => void }).reportError = (e) => reported.push(e as Error)
})
afterEach(() => {
  kl?.kill()
  globalThis.fetch = originalFetch
  delete (globalThis as { reportError?: unknown }).reportError
})

// Each test uses loan ids of its own: requests to Kiva for the same ids are shared
// while one is in flight (req.ts), across the catalogs of two tests as well.
describe('a batch from the server that holds loans without their details', () => {
  it('loads at once with every other loan, and never falls back to fetching the catalog from Kiva', async () => {
    const { fetchStub, asked } = fakeNetwork([[served(11), withoutDetails(12), served(13)], [withoutDetails(14), served(15)]])
    const { until } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)

    // The loans with details are all there the moment the batch is in.
    expect(kl.isReady()).toBe(true)
    expect([11, 13, 15].every((id) => kl.hasLoan(id))).toBe(true)
    expect(kl.getById(11)).toMatchObject({ status: 'fundraising', kls_repaid_in: 11, borrower_count: 1 })
    // The fast path went on to its next step, the changes since the batch.
    await vi.waitFor(() => expect(asked.some((u) => u.includes('/api/since/7'))).toBe(true))
    await until((m) => m.new_loans)
    // And the page never went to Kiva's listing for the catalog: that is the slow load.
    expect(asked.filter((u) => u.includes('loans/search.json'))).toEqual([])
  })

  it('asks Kiva for the loans left out, and adds them with their details', async () => {
    const { fetchStub, asked } = fakeNetwork([[served(21), withoutDetails(22), served(23)], [withoutDetails(24), served(25)]])
    const { until, whenAnnounced } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)
    await until((m) => m.new_loans)

    // They are in the catalog by the time they are announced: the list is rebuilt
    // from the catalog on that announcement, and showed none of them when it came first.
    expect(whenAnnounced).toEqual([[21, 22, 23, 24, 25]])

    // One request, for exactly the loans the batch came without.
    expect(asked.filter((u) => u.includes('api.kivaws.org')).map((u) => /\/loans\/([\d,]+)\.json/.exec(u)?.[1])).toEqual(['22,24'])
    expect(ids()).toEqual([21, 22, 23, 24, 25])
    // With what the batch could not give them: the story, the terms and the schedule.
    const completed = kl.getById(22)!
    expect(completed.description.texts.en).toBe('She sells soap from her house.')
    expect(completed.terms.repayment_interval).toBe('Monthly')
    expect(completed.kl_repayments?.length).toBeGreaterThan(0)
    expect(completed.borrowers).toHaveLength(1)
  })

  it('asks a hundred at a time, each request on its own: one Kiva refuses does not cost the others', async () => {
    const bare = Array.from({ length: 250 }, (_, i) => withoutDetails(1000 + i))
    const { fetchStub, asked } = fakeNetwork([[served(71), ...bare]], (wanted) => wanted.includes(1150))
    const { until } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)
    await vi.waitFor(() => expect(kl.loansFromKiva.length).toBe(1 + 150), { timeout: 4000 })
    expect(asked.filter((u) => u.includes('api.kivaws.org')).map((u) => /\/loans\/([\d,]+)\.json/.exec(u)![1].split(',').length)).toEqual([100, 100, 50])
    // The hundred with the id Kiva refused are not in; the rest are.
    expect(kl.hasLoan(1099)).toBe(true)
    expect(kl.hasLoan(1100)).toBe(false)
    expect(kl.hasLoan(1249)).toBe(true)
  })

  it('tells the error collector, without a loan id or a count in the message', async () => {
    const { fetchStub } = fakeNetwork([[served(31), withoutDetails(32), withoutDetails(33)]])
    const { until } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)
    await until((m) => m.new_loans)
    // Once for the page of the batch, however many loans it left out.
    expect(reported.map((e) => e.message)).toEqual(['Loans left out of a batch: The server sent a loan without its details'])
  })

  it('leaves out an entry that is no loan at all, and has nothing to ask Kiva for', async () => {
    const { fetchStub, asked } = fakeNetwork([[served(41), null, 'loan', 17, served(42)]])
    const { until } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)
    await vi.waitFor(() => expect(asked.some((u) => u.includes('/api/loans/7/keywords/1'))).toBe(true))
    expect(ids()).toEqual([41, 42])
    expect(asked.filter((u) => u.includes('api.kivaws.org'))).toEqual([])
  })

  it('asks Kiva for a loan it could not process for any other reason too', async () => {
    // A name that is not text stops processing; Kiva's own copy of the loan is whole.
    const { fetchStub } = fakeNetwork([[served(51), served(52, { name: 17 })]])
    const { until } = load(fetchStub as unknown as typeof fetch)
    await until((m) => m.loans_loaded)
    await until((m) => m.new_loans)
    expect(ids()).toEqual([51, 52])
    expect(kl.getById(52)!.name).toBe('Borrower 52')
  })

  it('falls back to Kiva only when the batch holds nothing it can use', async () => {
    const { fetchStub, asked } = fakeNetwork([[withoutDetails(61), withoutDetails(62)]])
    load(fetchStub as unknown as typeof fetch)
    await vi.waitFor(() => expect(asked.some((u) => u.includes('loans/search.json'))).toBe(true), { timeout: 4000 })
    expect(kl.loansFromKiva).toEqual([])
  })
})

describe('processing a batch of loans', () => {
  it('returns the loans it could process and hands over the ones it could not, with why', () => {
    const leftOut: Array<[unknown, unknown]> = []
    const batch = [served(1), withoutDetails(2), null, served(3)]
    const kept = ResultProcessors.processLoans(batch, (loan, error) => leftOut.push([loan, error]))
    expect(kept.map((l) => l.id)).toEqual([1, 3])
    expect(kept.every((l) => l.kl_processed instanceof Date)).toBe(true)
    expect(leftOut.map(([loan]) => (loan as { id?: number } | null)?.id)).toEqual([2, undefined])
    expect(leftOut[0][1]).toBeInstanceOf(LoanWithoutDetails)
  })

  it('reports once for the batch, with the first reason', () => {
    ResultProcessors.processLoans([withoutDetails(1), withoutDetails(2), null])
    expect(reported.map((e) => e.message)).toEqual(['Loans left out of a batch: The server sent a loan without its details'])
  })

  it('reports nothing for a batch it could process whole', () => {
    expect(ResultProcessors.processLoans([served(1), served(2)])).toHaveLength(2)
    expect(reported).toEqual([])
  })

  it('does not lose the batch to a callback that throws, or to there being no collector', () => {
    delete (globalThis as { reportError?: unknown }).reportError
    const kept = ResultProcessors.processLoans([withoutDetails(1), served(2)], () => {
      throw new Error('bookkeeping broke')
    })
    expect(kept.map((l) => l.id)).toEqual([2])
  })

  it('still takes a loan from Kiva’s listing, which never has terms: only the server’s loans must', () => {
    const listed = { id: 9, name: 'Listed', posted_date: '2026-10-05T16:53:53Z', loan_amount: 500, status: 'fundraising', description: { languages: ['en'] } }
    expect(ResultProcessors.processLoans([listed]).map((l) => l.id)).toEqual([9])
    expect(reported).toEqual([])
  })

  it('setKivaLoans takes in only the loans that could be processed', () => {
    kl = createKivaLoans()
    kl.setKivaLoans([withoutDetails(1), served(2)] as never, true, true)
    expect(ids()).toEqual([2])
    kl.setKivaLoans([withoutDetails(3)] as never, false)
    expect(ids()).toEqual([2])
  })
})
