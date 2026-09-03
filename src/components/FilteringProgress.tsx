import { Alert, ProgressBar } from '../ui'
import { useCriteriaStore, useLoanStore } from '../stores'
import { useI18n } from '../i18n'
import {
  getPendingFilterReasons,
  type FilterReadinessReason,
} from '../lib/filterReadiness'

const REASON_LABELS: Record<FilterReadinessReason, string> = {
  'existing-loans': 'existing_loans',
  'loan-descriptions': 'loan_descriptions',
  'portfolio-balancing': 'portfolio_balancing_data',
}

/**
 * Global warning shown above the result list while an active criterion still
 * depends on asynchronously-loaded data. The current results remain usable for
 * review, but the notice makes their partial status explicit before basket work.
 */
export default function FilteringProgress() {
  const { t } = useI18n()
  const criteria = useCriteriaStore((s) => s.lastKnown)
  const pendingDependencies = useLoanStore((s) => s.pendingFilterDependencies)
  const reasons = getPendingFilterReasons(criteria, pendingDependencies)

  if (reasons.length === 0) return null

  const dependencies = reasons.map((reason) => t(REASON_LABELS[reason])).join(', ')

  return (
    <Alert
      variant="warning"
      role="status"
      aria-live="polite"
      className="not-rounded"
      style={{ marginBottom: 0 }}
    >
      <strong>{t('finishing_loan_filters_ellipsis')}</strong>
      <div style={{ fontSize: 13 }}>
        {t(
          'results_may_change_while_dependencies',
          { dependencies },
        )}
      </div>
      <ProgressBar
        now={100}
        variant="warning"
        striped
        animated
        label={t('filtering_ellipsis')}
        className="mt-2"
      />
    </Alert>
  )
}

/** Minimum portfolio-tab reveal requested by the lender-loading ticket. */
export function PortfolioLoansLoadingNotice() {
  const { t } = useI18n()
  const lenderLoansLoading = useLoanStore((s) => s.lenderLoansLoading)

  if (!lenderLoansLoading) return null

  return (
    <Alert variant="info" role="status" aria-live="polite" className="py-2" style={{ fontSize: 13 }}>
      {t('existing_loans_still_downloading')}
    </Alert>
  )
}
