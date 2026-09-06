import { PORTFOLIO_BALANCERS } from '../types'
import type { SavedSearch } from '../stores/criteriaStore'

export interface SummaryItem {
  label: string
  value: string
}

export type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * One line per criterion a saved search sets, in the order the criteria
 * tabs show them, for the saved-search list. Pure: no DOM, no store.
 */
export function summarizeCriteria(
  crit: SavedSearch | undefined,
  t: Translate,
  sector: (englishSector: string) => string,
): SummaryItem[] {
  if (!crit) return []
  const items: SummaryItem[] = []
  const loan = crit.loan as Record<string, unknown> | undefined
  if (loan) {
    if (loan.sector) items.push({
      label: t('sectors'),
      value: String(loan.sector).split(',').map((value) => sector(value.trim())).join(', '),
    })
    if (loan.country_code) items.push({ label: t('countries'), value: String(loan.country_code) })
    if (loan.activity) items.push({ label: t('activities'), value: String(loan.activity) })
    if (loan.tags) items.push({ label: t('tags'), value: String(loan.tags) })
    if (loan.themes) items.push({ label: t('themes'), value: String(loan.themes) })
    if (loan.repaid_in_min || loan.repaid_in_max)
      items.push({ label: t('repaid'), value: t('min_max_months', { min: String(loan.repaid_in_min ?? t('min')), max: String(loan.repaid_in_max ?? t('max')) }) })
    if (loan.still_needed_min || loan.still_needed_max)
      items.push({ label: t('still_needed'), value: `$${loan.still_needed_min ?? 0} – $${loan.still_needed_max ?? t('max')}` })
    if (loan.sort) items.push({ label: t('sort'), value: t(String(loan.sort)) })
    if (loan.name) items.push({ label: t('name_search_2'), value: String(loan.name) })
    if (loan.use) items.push({ label: t('use_description'), value: String(loan.use) })
  }
  const partner = crit.partner as Record<string, unknown> | undefined
  if (partner) {
    if (partner.region) items.push({ label: t('regions'), value: String(partner.region) })
    if (partner.religion) items.push({ label: t('religion'), value: String(partner.religion) })
  }
  if (crit.portfolio) {
    if (crit.portfolio.exclude_portfolio_loans === 'true')
      items.push({ label: t('portfolio'), value: t('excluding_my_loans') })
    for (const b of PORTFOLIO_BALANCERS) {
      const bal = crit.portfolio[b]
      if (bal?.enabled) items.push({ label: t('balancing'), value: t(b.replace('pb_', '')) })
    }
  }
  return items
}
