import { useState, useCallback } from 'react'
import { useLoanStore } from '../stores'
import type { BasketItem } from '../types'
import { useI18n } from '../i18n'

interface BulkAddModalProps {
  onHide: () => void
}

/**
 * Modal for adding multiple loans to the basket at once.
 * Uses the current filtered/sorted loans, skipping any already in basket.
 * Respects Kiva's $10,000 basket maximum.
 */
export default function BulkAddModal({ onHide }: BulkAddModalProps) {
  const { t, currency } = useI18n()
  const filteredLoans = useLoanStore((s) => s.filteredLoans)
  const basket = useLoanStore((s) => s.basket)
  const inBasket = useLoanStore((s) => s.inBasket)
  const batchAddToBasket = useLoanStore((s) => s.batchAddToBasket)

  const currentBasketTotal = basket.reduce((sum, bi) => sum + bi.amount, 0)
  const basketSpace = 10000 - currentBasketTotal

  const [maxBasket, setMaxBasket] = useState(Math.min(1000, basketSpace))
  const [maxPerLoan, setMaxPerLoan] = useState(25)

  const handleAdd = useCallback(() => {
    let amountRemaining = Math.min(maxBasket, basketSpace)
    const toAdd: BasketItem[] = []

    for (const loan of filteredLoans) {
      if (inBasket(loan.id)) continue
      const stillNeeded = loan.kl_still_needed ?? Math.max(loan.loan_amount - loan.funded_amount, 0)
      const toLend = Math.min(stillNeeded, amountRemaining, maxPerLoan)
      if (toLend > 0) {
        amountRemaining -= toLend
        toAdd.push({ loan_id: loan.id, amount: toLend })
      }
      if (amountRemaining < 25) break
    }

    batchAddToBasket(toAdd)
    onHide()
  }, [maxBasket, maxPerLoan, basketSpace, filteredLoans, inBasket, batchAddToBasket, onHide])

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('bulk_add')}</h5>
            <button type="button" className="btn-close" onClick={onHide} aria-label={t('close')} />
          </div>
          <div className="modal-body">
            <p>
              {t('mega_lender_tool_using_current_sort')}
            </p>
            <div className="mb-3">
              <label className="form-label">{t('max_lend_dollar_amount', { amount: currency(maxBasket) })}</label>
              <input
                type="range"
                className="form-range"
                min={25}
                max={basketSpace}
                step={25}
                value={maxBasket}
                onChange={(e) => setMaxBasket(parseInt(e.target.value, 10))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">{t('max_per_loan_dollar_amount', { amount: currency(maxPerLoan) })}</label>
              <input
                type="range"
                className="form-range"
                min={25}
                max={250}
                step={25}
                value={maxPerLoan}
                onChange={(e) => setMaxPerLoan(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={handleAdd}>
              {t('add_bunch')}
            </button>
            <button className="btn btn-secondary" onClick={onHide}>
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
