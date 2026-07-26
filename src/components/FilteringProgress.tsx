import { Alert, ProgressBar } from '../ui'
import { useCriteriaStore, useLoanStore } from '../stores'
import { useI18n } from '../i18n'
import {
  getPendingFilterReasons,
  type FilterReadinessReason,
} from '../lib/filterReadiness'

const REASON_LABELS: Record<FilterReadinessReason, string> = {
  'existing-loans': 'your existing loans',
  'loan-descriptions': 'loan descriptions',
  'portfolio-balancing': 'portfolio balancing data',
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
      <strong>{t('Finishing your loan filters…')}</strong>
      <div style={{ fontSize: 13 }}>
        {t(
          'Results may change while {dependencies} finish loading. Wait before adding loans to your basket.',
          { dependencies },
        )}
      </div>
      <ProgressBar
        now={100}
        variant="warning"
        striped
        animated
        label={t('Filtering…')}
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
      {t('Your existing loans are still downloading. Portfolio filters will update when the download finishes.')}
    </Alert>
  )
}
