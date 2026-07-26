import type { Criteria } from '../types'

export const LENDER_LOANS_FILTER_DEPENDENCY = 'lender-loans'
export const LOAN_DESCRIPTIONS_FILTER_DEPENDENCY = 'loan-descriptions'
export const PORTFOLIO_BALANCER_FILTER_DEPENDENCY_PREFIX = 'portfolio-balancer:'

export type FilterReadinessReason =
  | 'existing-loans'
  | 'loan-descriptions'
  | 'portfolio-balancing'

/**
 * Return only dependencies that can still change the CURRENT filtered list.
 * Background work that is unrelated to an active criterion stays out of the
 * warning so the list is not presented as incomplete when it is already stable.
 */
export function getPendingFilterReasons(
  criteria: Criteria,
  pendingDependencies: string[],
): FilterReadinessReason[] {
  const pending = new Set(pendingDependencies)
  const reasons: FilterReadinessReason[] = []

  if (
    pending.has(LENDER_LOANS_FILTER_DEPENDENCY) &&
    criteria.portfolio?.exclude_portfolio_loans === 'true'
  ) {
    reasons.push('existing-loans')
  }

  if (
    pending.has(LOAN_DESCRIPTIONS_FILTER_DEPENDENCY) &&
    String(criteria.loan?.use ?? '').trim().length > 0
  ) {
    reasons.push('loan-descriptions')
  }

  if (
    pendingDependencies.some((key) =>
      key.startsWith(PORTFOLIO_BALANCER_FILTER_DEPENDENCY_PREFIX),
    )
  ) {
    reasons.push('portfolio-balancing')
  }

  return reasons
}
