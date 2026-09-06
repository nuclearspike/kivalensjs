import { describe, expect, it } from 'vitest'
import { summarizeCriteria } from './summarizeCriteria'
import { PORTFOLIO_BALANCERS } from '../types'
import type { SavedSearch } from '../stores/criteriaStore'

const t = (key: string) => key
const sector = (s: string) => s

describe('summarizeCriteria', () => {
  it('lists every enabled portfolio balancer, in the order the Portfolio tab shows them', () => {
    const crit = {
      portfolio: Object.fromEntries(PORTFOLIO_BALANCERS.map((k) => [k, { enabled: true }])),
    } as unknown as SavedSearch
    const values = summarizeCriteria(crit, t, sector)
      .filter((i) => i.label === 'balancing')
      .map((i) => i.value)
    expect(values).toEqual(['partner', 'country', 'region', 'sector', 'activity', 'gender'])
  })

  it('names region and gender balancers when only they are enabled', () => {
    const crit = { portfolio: { pb_region: { enabled: true }, pb_gender: { enabled: true }, pb_sector: { enabled: false } } } as unknown as SavedSearch
    const values = summarizeCriteria(crit, t, sector).filter((i) => i.label === 'balancing').map((i) => i.value)
    expect(values).toEqual(['region', 'gender'])
  })

  it('returns nothing for an undefined search', () => {
    expect(summarizeCriteria(undefined, t, sector)).toEqual([])
  })
})
