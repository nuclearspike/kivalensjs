/**
 * Failures the page handles itself reach the error collector. After the release of
 * 2026-10-14 every portfolio-balancing read failed for 29 hours: the page showed
 * "could not read" and nothing was recorded until a lender filed an issue.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createKivaLoans, type Loans } from './kiva'
import { recordedResponse } from '../test/upstream'

let reported: string[]
let originalFetch: typeof globalThis.fetch
let kl: Loans

beforeEach(() => {
  originalFetch = globalThis.fetch
  reported = []
  ;(globalThis as { reportError?: (e: unknown) => void }).reportError = (e) => reported.push((e as Error).message)
  kl = createKivaLoans()
})
afterEach(() => {
  kl.kill()
  globalThis.fetch = originalFetch
  delete (globalThis as { reportError?: unknown }).reportError
})

const answer = (status: number, body = '') => ({ ok: status < 400, status, json: async () => JSON.parse(body || '{}'), text: async () => body }) as unknown as Response

describe('failures the page handles itself are reported', () => {
  it('a portfolio read the proxy refuses', async () => {
    globalThis.fetch = vi.fn(async () => answer(502, 'Proxy upstream did not return data')) as unknown as typeof fetch
    kl.lenderId = 'somelender'
    await expect(kl.loadBalancerData('partner', 'active')).rejects.toThrow()
    expect(reported).toEqual(['Reading portfolio figures from Kiva failed: HTTP 502'])
    expect(kl.balancerFailures()).toEqual([{ sliceBy: 'partner', include: 'active' }])
  })

  it('not Kiva’s answer for an empty slice, which is an answer: no slices', async () => {
    globalThis.fetch = vi.fn(async () => recordedResponse('kiva-supergraph-country-active-empty.json')) as unknown as typeof fetch
    kl.lenderId = 'somelender'
    expect(await kl.loadBalancerData('country', 'active')).toMatchObject({ slices: [], total_sum: 0 })
    expect(reported).toEqual([])
  })

  it('the catch-up from Kiva', async () => {
    globalThis.fetch = vi.fn(async () => answer(503)) as unknown as typeof fetch
    await kl.backgroundResync()
    expect(reported).toEqual(['Catching up from Kiva failed: HTTP 503'])
  })

  it('a listener that throws, which the catalog carries on without', () => {
    kl.onNotify(() => {
      throw new Error('store broke')
    })
    kl.mergeLoanAndNotify({ id: 1, status: 'fundraising', loan_amount: 100, funded_amount: 0, basket_amount: 0 } as never, { funded_amount: 25 })
    expect(reported[0]).toBe('A catalog listener failed: store broke')
  })

  it('the lender’s own loans, without which their loans cannot be left out', async () => {
    // The read waits half a second, then tries a page five times with growing pauses (15.5 s in all).
    vi.useFakeTimers()
    try {
      globalThis.fetch = vi.fn(async () => answer(500)) as unknown as typeof fetch
      kl.setLender('somelender')
      await vi.advanceTimersByTimeAsync(20_000)
      expect(reported.filter((m) => m.startsWith('Reading the lender\'s own loans from Kiva failed: '))).toHaveLength(1)
      expect(reported.join(' ')).not.toContain('somelender')
    } finally {
      vi.useRealTimers()
    }
  })
})
