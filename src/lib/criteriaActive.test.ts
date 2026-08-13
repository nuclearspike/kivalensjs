import { describe, expect, it } from 'vitest'
import { activeCriteria } from './criteriaActive'
import { translate, type Locale } from '../i18n'
import type { Criteria } from '../types'

// The active-filter summary is what users trust to explain why they see the
// loans they see, so a wrong chip is a lie about their own search. It had no
// tests at all; these cover every branch that builds one.
const crit = (c: Partial<Record<'loan' | 'partner' | 'portfolio', Record<string, unknown>>>): Criteria =>
  ({ loan: {}, partner: {}, portfolio: {}, ...c }) as unknown as Criteria

const byId = (c: Criteria, id: string) => activeCriteria(c).find((a) => a.id === id)

describe('activeCriteria — limit_to (diversification cap)', () => {
  it('reports the USER-SET cap, not a hardcoded 1', () => {
    // Regression: a user capping 32 loans per partner saw "Limit to 1 per Partner".
    const a = byId(crit({ loan: { limit_to: { enabled: true, count: 32, limit_by: 'Partner' } } }), 'loan.limit_to')
    expect(a).toBeDefined()
    expect(a!.label).toBe('Limit to {count} per {group}')
    expect(a!.labelParams).toEqual({ count: 32, group: 'Partner' })
  })

  it('carries the grouping field through', () => {
    const a = byId(crit({ loan: { limit_to: { enabled: true, count: 5, limit_by: 'Country' } } }), 'loan.limit_to')
    expect(a!.labelParams).toEqual({ count: 5, group: 'Country' })
  })

  it.each([
    ['missing', undefined],
    ['zero', 0],
    ['negative', -3],
    ['not a number', 'abc'],
  ])('falls back to 1 when the count is %s', (_why, count) => {
    const a = byId(crit({ loan: { limit_to: { enabled: true, count, limit_by: 'Sector' } } }), 'loan.limit_to')
    expect(a!.labelParams).toMatchObject({ count: 1 })
  })

  it('defaults the group to Partner when unset', () => {
    const a = byId(crit({ loan: { limit_to: { enabled: true, count: 4 } } }), 'loan.limit_to')
    expect(a!.labelParams).toEqual({ count: 4, group: 'Partner' })
  })

  it('is not listed when disabled', () => {
    expect(byId(crit({ loan: { limit_to: { enabled: false, count: 9 } } }), 'loan.limit_to')).toBeUndefined()
  })

  it('removal drops the whole limit_to object', () => {
    const c = crit({ loan: { limit_to: { enabled: true, count: 32, limit_by: 'Partner' } } })
    expect(byId(c, 'loan.limit_to')!.without(c).loan.limit_to).toBeUndefined()
  })
})

describe('activeCriteria — include vs exclude must be distinguishable', () => {
  it('marks an excluded multi-select with the none modifier', () => {
    // Regression: "everything but Retail" rendered identically to "only Retail".
    const a = byId(crit({ loan: { sector: 'Retail', sector_all_any_none: 'none' } }), 'loan.sector')
    expect(a!.modifier).toBe('none')
  })

  it('leaves a plain include unmarked', () => {
    expect(byId(crit({ loan: { sector: 'Retail' } }), 'loan.sector')!.modifier).toBeUndefined()
  })

  it('treats the explicit any modifier as a plain include', () => {
    expect(byId(crit({ loan: { sector: 'Retail', sector_all_any_none: 'any' } }), 'loan.sector')!.modifier).toBeUndefined()
  })

  it('marks an all-of multi-select', () => {
    const a = byId(crit({ loan: { tags: '#Parent,#Vegan', tags_all_any_none: 'all' } }), 'loan.tags')
    expect(a!.modifier).toBe('all')
    expect(a!.value).toBe('#Parent, #Vegan')
  })

  it('applies the same rule to partner multi-selects', () => {
    const a = byId(crit({ partner: { region: 'me', region_all_any_none: 'none' } }), 'partner.region')
    expect(a!.modifier).toBe('none')
  })

  it('removal clears the value AND its any/all/none modifier', () => {
    const c = crit({ loan: { sector: 'Retail', sector_all_any_none: 'none' } })
    const next = byId(c, 'loan.sector')!.without(c)
    expect(next.loan.sector).toBeUndefined()
    expect(next.loan.sector_all_any_none).toBeUndefined()
  })
})

describe('activeCriteria — ranges', () => {
  it.each([
    ['both bounds', { age_min: 20, age_max: 40 }, '20 – 40'],
    ['min only', { age_min: 20 }, '20 – –'],
    ['max only', { age_max: 40 }, '– – 40'],
  ])('renders %s', (_why, loan, expected) => {
    expect(byId(crit({ loan }), 'loan.age')!.value).toBe(expected)
  })

  it('is not listed when neither bound is set', () => {
    expect(byId(crit({ loan: {} }), 'loan.age')).toBeUndefined()
  })

  it('removal drops both bounds', () => {
    const c = crit({ loan: { age_min: 20, age_max: 40 } })
    const next = byId(c, 'loan.age')!.without(c)
    expect(next.loan.age_min).toBeUndefined()
    expect(next.loan.age_max).toBeUndefined()
  })

  it('ignores a partner range whose bounds are both empty', () => {
    // The key exists but holds no bound — that is not a filter.
    expect(byId(crit({ partner: { partner_risk_rating_min: null, partner_risk_rating_max: null } }), 'partner.partner_risk_rating')).toBeUndefined()
  })

  it('lists a partner range that has a real bound', () => {
    const a = byId(crit({ partner: { partner_risk_rating_min: 4 } }), 'partner.partner_risk_rating')
    expect(a).toBeDefined()
    expect(a!.value).toBe('4 – –')
  })
})

describe('activeCriteria — portfolio', () => {
  it('lists the exclude-my-loans filter only when on', () => {
    expect(byId(crit({ portfolio: { exclude_portfolio_loans: 'true' } }), 'portfolio.exclude')).toBeDefined()
    expect(byId(crit({ portfolio: { exclude_portfolio_loans: 'false' } }), 'portfolio.exclude')).toBeUndefined()
  })

  it('turns exclude-my-loans off rather than deleting it', () => {
    const c = crit({ portfolio: { exclude_portfolio_loans: 'true' } })
    expect(byId(c, 'portfolio.exclude')!.without(c).portfolio.exclude_portfolio_loans).toBe('false')
  })

  it.each(['pb_sector', 'pb_country', 'pb_activity', 'pb_partner', 'pb_region', 'pb_gender'])(
    'lists the %s balancer when enabled',
    (pb) => {
      const c = crit({ portfolio: { [pb]: { enabled: true } } })
      const a = byId(c, `portfolio.${pb}`)
      expect(a).toBeDefined()
      // Disabling must PRESERVE the balancer's other settings.
      const next = a!.without(c)
      expect((next.portfolio as Record<string, { enabled: boolean }>)[pb].enabled).toBe(false)
    },
  )

  it('does not list a disabled balancer', () => {
    expect(byId(crit({ portfolio: { pb_sector: { enabled: false } } }), 'portfolio.pb_sector')).toBeUndefined()
  })
})

describe('activeCriteria — general contract', () => {
  it('returns nothing for an empty search', () => {
    expect(activeCriteria(crit({}))).toEqual([])
  })

  it('never mutates the criteria it was given', () => {
    const c = crit({ loan: { sector: 'Retail', sector_all_any_none: 'none' }, portfolio: { pb_sector: { enabled: true } } })
    const snapshot = JSON.stringify(c)
    for (const a of activeCriteria(c)) a.without(c)
    expect(JSON.stringify(c)).toBe(snapshot)
  })

  it('gives every active filter a unique id', () => {
    const items = activeCriteria(crit({
      loan: { sector: 'Retail', country_code: 'PE', age_min: 20, name: 'maria', limit_to: { enabled: true, count: 3 } },
      partner: { region: 'me', partner_risk_rating_min: 4 },
      portfolio: { exclude_portfolio_loans: 'true', pb_country: { enabled: true } },
    }))
    const ids = items.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    // sector, country, age, name, limit_to, region, risk-rating, exclude, pb_country
    expect(items.length).toBe(9)
  })

  it('lists free-text filters', () => {
    expect(byId(crit({ loan: { name: 'maria' } }), 'loan.name')!.value).toBe('maria')
    expect(byId(crit({ loan: { use: 'bakery' } }), 'loan.use')!.label).toBe('Use/Description')
  })

  it('ignores blank free text', () => {
    expect(byId(crit({ loan: { name: '   ' } }), 'loan.name')).toBeUndefined()
  })
})

describe('activeCriteria — chip labels localize with their params', () => {
  const locales: Locale[] = ['en', 'es', 'fr', 'de', 'it', 'nl']

  it.each(locales)('renders the real cap (not a literal placeholder) in %s', (loc) => {
    const a = byId(crit({ loan: { limit_to: { enabled: true, count: 32, limit_by: 'Partner' } } }), 'loan.limit_to')!
    const params = Object.fromEntries(
      Object.entries(a.labelParams!).map(([k, v]) => [k, typeof v === 'string' ? translate(loc, v) : v]),
    )
    const text = translate(loc, a.label, params)
    expect(text).toContain('32')
    expect(text).not.toContain('{count}')
    expect(text).not.toContain('{group}')
  })

  it.each(locales)('renders the exclude wrapper in %s', (loc) => {
    const text = translate(loc, 'not {value}', { value: 'Retail' })
    expect(text).toContain('Retail')
    expect(text).not.toContain('{value}')
    // Must not silently fall back to the raw key.
    if (loc !== 'en') expect(text).not.toBe('not {value}')
  })

  it.each(locales)('renders the all-of wrapper in %s', (loc) => {
    const text = translate(loc, 'all of {value}', { value: '#Parent' })
    expect(text).toContain('#Parent')
    expect(text).not.toContain('{value}')
  })
})
