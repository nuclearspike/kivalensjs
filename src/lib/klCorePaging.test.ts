import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createState, prepareData, loansFilterable } from '../../server/klCore.mjs'

/**
 * Kiva's fundraising listing is LIVE: loans fund out and new ones post while the
 * server is paging through it. Because paging is offset-based, a shift between
 * page N and N+1 can either
 *   - push a loan back across the boundary  -> it is returned TWICE, or
 *   - pull a loan forward across it        -> it is MISSED entirely.
 *
 * The client trusts server batches (setKivaLoans(..., trustNoDupes=true)), so
 * anything the server emits is shown as-is. That makes de-duplication the
 * SERVER's job, and makes a missed loan self-healing: the next refresh re-pulls
 * the whole listing and picks it up.
 */

const loan = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Borrower ${id}`,
  status: 'fundraising',
  loan_amount: 1000,
  funded_amount: 0,
  basket_amount: 0,
  posted_date: '2026-06-01T00:00:00Z',
  sector: 'Agriculture',
  activity: 'Farming',
  use: 'to buy seed',
  location: { country_code: 'KE', country: 'Kenya' },
  terms: { repayment_interval: 'monthly', scheduled_payments: [] },
  borrowers: [{ gender: 'F' }],
  description: { texts: { en: 'A farmer.' } },
  tags: [],
  ...extra,
})

/** Serve a fake Kiva whose search listing is whatever `pages` says right now. */
function fakeKiva(pages: () => Array<Array<ReturnType<typeof loan>>>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response

    if (typeof url === 'string' && url.includes('graphql')) {
      return ok({ data: { lend: { sector: [], activity: [], tag: [], loanThemeFilter: [] } } })
    }
    if (typeof url === 'string' && url.includes('docs.google.com')) {
      // A+ spreadsheet is optional; prepareData catches its failure.
      return { ok: false, status: 404, text: async () => '' } as unknown as Response
    }
    if (typeof url === 'string' && url.includes('/partners.json')) {
      return ok({ paging: { pages: 1, page: 1 }, partners: [] })
    }
    if (typeof url === 'string' && url.includes('/loans/search.json')) {
      const p = pages()
      const page = Number(new URL(url).searchParams.get('page') || '1')
      return ok({ paging: { pages: p.length, page }, loans: p[page - 1] ?? [] })
    }
    if (typeof url === 'string' && /\/loans\/[\d,]+\.json/.test(url)) {
      const wanted = url.split('/loans/')[1].split('.json')[0].split(',').map(Number)
      // Detail is id-addressed, so it can never itself duplicate. Echo the loan
      // as the listing described it, so per-loan fields (e.g. funded_amount)
      // are not silently reset by the fake.
      const byId = new Map(pages().flat().map((l) => [l.id, l]))
      return ok({ loans: wanted.map((id) => byId.get(id) ?? loan(id)) })
    }
    void init
    return ok({})
  })
}

const ids = (state: { allLoans: Array<{ id: number }> }) => state.allLoans.map((l) => l.id).sort((a, b) => a - b)
const silent = () => {}

let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  originalFetch = globalThis.fetch
  vi.useFakeTimers() // prepareData defers a snapshot write ~8s out; never let it fire
})
afterEach(() => {
  globalThis.fetch = originalFetch
  vi.useRealTimers()
})

describe('klCore paging — a live listing that shifts mid-pull', () => {
  it('emits each loan ONCE when a shift repeats one across the page boundary', async () => {
    // Loan 3 funds out between page 1 and 2, shifting the window back by one, so
    // loan 4 is served again at the head of page 2.
    globalThis.fetch = fakeKiva(() => [
      [loan(1), loan(2), loan(3), loan(4)],
      [loan(4), loan(5), loan(6)],
    ]) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)

    expect(ids(state)).toEqual([1, 2, 3, 4, 5, 6])
    expect(state.allLoans.filter((l: { id: number }) => l.id === 4)).toHaveLength(1)
  })

  it('survives the same loan appearing on several pages', async () => {
    globalThis.fetch = fakeKiva(() => [
      [loan(1), loan(2)],
      [loan(2), loan(3)],
      [loan(3), loan(1)],
    ]) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)

    expect(ids(state)).toEqual([1, 2, 3])
  })

  it('picks up a loan missed at a boundary on the NEXT refresh', async () => {
    // Pass 1: a new loan posts mid-pull, pushing loan 3 forward past the seam.
    let listing: Array<Array<ReturnType<typeof loan>>> = [
      [loan(1), loan(2)],
      [loan(4), loan(5)], // 3 was skipped
    ]
    globalThis.fetch = fakeKiva(() => listing) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)
    expect(ids(state)).toEqual([1, 2, 4, 5])
    expect(ids(state)).not.toContain(3)

    // Pass 2: the listing is stable, so the full re-pull recovers it.
    listing = [
      [loan(1), loan(2)],
      [loan(3), loan(4), loan(5)],
    ]
    await prepareData(state, silent)
    expect(ids(state)).toEqual([1, 2, 3, 4, 5])
  })

  it('publishes a NEW batch per refresh so clients can tell datasets apart', async () => {
    globalThis.fetch = fakeKiva(() => [[loan(1), loan(2)]]) as unknown as typeof fetch
    const state = createState()

    await prepareData(state, silent)
    const first = state.batch
    await prepareData(state, silent)

    expect(state.batch).toBe(first + 1)
    expect(state.ready).toBe(true)
  })
})

/**
 * Reproduces the warm start: Redis restores the compressed API pages plus
 * PARTIAL loan details (descriptions/repayments, no country or sector) and marks
 * the server ready, while the full live objects are still being fetched. Running
 * the shared filter over those partials matches nothing — which made the
 * assistant tell users "no loans match" for ~3 minutes after every deploy, while
 * the site itself showed thousands from the browser's own cache.
 */
describe('loansFilterable — warm start must not look like an empty result set', () => {
  it('is false when the warm start marked the server ready with partial loans', () => {
    const s = createState()
    s.ready = true // /api pages are servable...
    s.allLoans = [{ id: 1, description: { texts: { en: 'hi' } } }] as never // ...but these cannot be filtered
    expect(s.rssReady).toBe(false)
    expect(loansFilterable(s)).toBe(false)
  })

  it('is false before anything has loaded', () => {
    expect(loansFilterable(createState())).toBe(false)
  })

  it('is true once a live refresh has published full loans', async () => {
    globalThis.fetch = fakeKiva(() => [[loan(1), loan(2)]]) as unknown as typeof fetch
    const state = createState()
    await prepareData(state, silent)

    expect(loansFilterable(state)).toBe(true)
    expect(state.rssReady).toBe(true)
  })

  it('tolerates a missing/!bogus state rather than throwing', () => {
    expect(loansFilterable(null as never)).toBe(false)
    expect(loansFilterable({} as never)).toBe(false)
  })
})

describe('klCore paging — listing mechanics', () => {
  it('walks every page reported by paging.pages', async () => {
    globalThis.fetch = fakeKiva(() => [
      [loan(1)], [loan(2)], [loan(3)], [loan(4)],
    ]) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)
    expect(ids(state)).toEqual([1, 2, 3, 4])
  })

  it('tolerates an empty page without dropping the rest', async () => {
    globalThis.fetch = fakeKiva(() => [[loan(1)], [], [loan(3)]]) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)
    expect(ids(state)).toEqual([1, 3])
  })

  it('drops loans that funded out during the pull', async () => {
    // Kiva still lists it as fundraising, but it is fully funded -> not lendable.
    globalThis.fetch = fakeKiva(() => [
      [loan(1), loan(2, { funded_amount: 1000 })],
    ]) as unknown as typeof fetch

    const state = createState()
    await prepareData(state, silent)
    expect(ids(state)).toEqual([1])
  })

  it('leaves the previous dataset intact when the pull fails outright', async () => {
    globalThis.fetch = fakeKiva(() => [[loan(1), loan(2)]]) as unknown as typeof fetch
    const state = createState()
    await prepareData(state, silent)
    const before = ids(state)
    const batchBefore = state.batch

    globalThis.fetch = vi.fn(async () => { throw new Error('Kiva down') }) as unknown as typeof fetch
    await prepareData(state, silent) // must not throw

    expect(ids(state)).toEqual(before)
    expect(state.batch).toBe(batchBefore)
  })
})
