import { afterEach, describe, it, expect, vi } from 'vitest'
import { fetchSuperGraphSlices, resolveBalancerValues } from '../../server/lenderData.mjs'
import { recorded, recordedResponse } from '../test/upstream'

const slices = [
  { id: '1', name: 'Agriculture', value: 50, percent: 50 },
  { id: '2', name: 'Retail', value: 30, percent: 30 },
  { id: '3', name: 'Food', value: 20, percent: 20 },
]

describe('resolveBalancerValues', () => {
  it('gt keeps slices above the percent threshold (by name)', () => {
    expect(resolveBalancerValues({ ltgt: 'gt', percent: 25 }, slices, 'sector')).toEqual([
      'Agriculture',
      'Retail',
    ])
  })

  it('lt keeps slices below the percent threshold (by name)', () => {
    expect(resolveBalancerValues({ ltgt: 'lt', percent: 25 }, slices, 'sector')).toEqual(['Food'])
  })

  it('partner slices resolve to numeric ids', () => {
    expect(resolveBalancerValues({ ltgt: 'gt', percent: 25 }, slices, 'partner')).toEqual([1, 2])
  })

  it('treats a missing threshold as 0', () => {
    expect(resolveBalancerValues({ ltgt: 'gt' }, slices, 'sector')).toEqual([
      'Agriculture',
      'Retail',
      'Food',
    ])
  })
})

describe('fetchSuperGraphSlices, on Kiva\u2019s real answers', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('reads the slices from Kiva\u2019s JSON, which Kiva labels text/html', async () => {
    globalThis.fetch = vi.fn(async () => recordedResponse('kiva-supergraph-partner-all.json')) as unknown as typeof fetch
    const slices = await fetchSuperGraphSlices(`fixture-lender-${Date.now()}`, 'partner', 'all')
    const raw = JSON.parse(recorded('kiva-supergraph-partner-all.json').body!) as { data: Array<{ name: string; value: string }>; lookup: Record<string, string | null> }
    expect(slices).toHaveLength(raw.data.length)
    // Kiva names direct loans "-1" and gives them no name (null in its lookup): the id stands in.
    expect(slices.map((s: { id: string; name: string; value: number }) => [s.id, s.name, s.value])).toEqual(raw.data.map((d) => [d.name, raw.lookup[d.name] ?? d.name, Number(d.value)]))
    expect(slices.reduce((sum: number, s: { percent: number }) => sum + s.percent, 0)).toBeCloseTo(100)
  })

  it('reads Kiva\u2019s answer for an empty slice as no slices', async () => {
    globalThis.fetch = vi.fn(async () => recordedResponse('kiva-supergraph-country-active-empty.json')) as unknown as typeof fetch
    expect(await fetchSuperGraphSlices(`fixture-lender-${Date.now()}`, 'country', 'active')).toEqual([])
  })
})
