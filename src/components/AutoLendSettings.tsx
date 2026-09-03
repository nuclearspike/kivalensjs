import { useState, useMemo, useEffect } from 'react'
import { Container, Alert, Button, Form } from '../ui'
import { showAlert } from '../lib/dialog'
import { useCriteriaStore } from '../stores'
import { getKivaLoans, defaultKivaData } from '../api/kiva'
import { useI18n } from '../i18n'

function KivaLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a href={`https://www.kiva.org/${path}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function Component() {
  const { t } = useI18n()
  const lastCriteria = useCriteriaStore((s) => s.getLastCriteria)
  const criteria = useCriteriaStore((s) => s.lastKnown)

  const [includePartners, setIncludePartners] = useState(true)
  const [includeSectors, setIncludeSectors] = useState(true)
  const [includeCountries, setIncludeCountries] = useState(true)

  const totalSectors = defaultKivaData.sectors.length
  const totalCountries = defaultKivaData.countries.length

  const { partnerIds, sectors, countries, totalPartners } = useMemo(() => {
    const kl = getKivaLoans()
    if (!kl || !kl.isReady()) {
      return { partnerIds: [] as number[], sectors: [] as string[], countries: [] as string[], totalPartners: 0 }
    }
    const crit = lastCriteria()
    return {
      partnerIds: kl.getListOfPartners(crit),
      sectors: kl.getListOfSectors(crit),
      countries: kl.getListOfCountries(crit),
      totalPartners: kl.activePartners.length,
    }
  }, [lastCriteria, criteria])

  // Auto-adjust checkboxes based on whether filtering is meaningful
  useEffect(() => {
    setIncludePartners(partnerIds.length !== totalPartners)
    setIncludeSectors(sectors.length !== totalSectors)
    setIncludeCountries(countries.length !== totalCountries)
  }, [partnerIds.length, totalPartners, sectors.length, totalSectors, countries.length, totalCountries])

  const problems: string[] = []

  const isChrome = typeof window !== 'undefined' && /Chrome/.test(navigator.userAgent)
  if (!isChrome) {
    problems.push(
      t('not_using_google_chrome_browser'),
    )
  }

  const allBroad =
    partnerIds.length === totalPartners &&
    sectors.length === totalSectors &&
    countries.length === totalCountries
  if (allBroad) {
    problems.push(
      t('criteria_so_broad_there_nothing'),
    )
  }

  const noneChecked = !includePartners && !includeSectors && !includeCountries

  const handlePush = () => {
    if (noneChecked) {
      void showAlert(t('please_check_least_one_box'))
      return
    }
    const payload: {
      partners?: number[]
      sectors?: string[]
      countries?: string[]
    } = {}
    if (includePartners) payload.partners = partnerIds
    if (includeSectors) payload.sectors = sectors
    if (includeCountries) payload.countries = countries

    // Attempt to send via the KLA Chrome extension
    try {
      const KLA_Extension = 'ehmkalmhgpadjmfcfekgdagfnmhakgna'
      const chromeGlobal = (window as unknown as Record<string, unknown>).chrome as
        | { runtime?: { sendMessage?: (id: string, msg: unknown, cb: (r: unknown) => void) => void } }
        | undefined
      if (chromeGlobal?.runtime?.sendMessage) {
        chromeGlobal.runtime.sendMessage(KLA_Extension, { setAutoLendPCS: payload }, (reply: unknown) =>
          console.log('KLA reply:', reply),
        )
      } else {
        void showAlert(
          t('chrome_extension_messaging_not_available'),
        )
      }
    } catch {
      void showAlert(
        t('could_not_communicate_kiva_lender'),
      )
    }
  }

  return (
    <Container className="py-3" style={{ maxWidth: 800 }}>
      <h3>{t('push_auto_lending_preferences_kiva')}</h3>

      <p>
        {t('kiva_has_offered')}{' '}
        <KivaLink path="settings/credit">{t('auto_lending')}</KivaLink>{' '}
        {t('auto_lending_active_description')}
      </p>

      <p>
        {t('use_page_set_kiva_preferences')}
      </p>

      <p>
        {t('portfolio_partner_statistics_change')}
      </p>

      <p>
        {t('before_using_feature_make_sure')}{' '}
        <KivaLink path="settings/credit">{t('auto_lending')}</KivaLink>{' '}{t('enabled_kiva')}
      </p>

      <hr />

      <p>{t('continuing_kivalens_instruct_kiva_lender')}</p>
      <ul className="list-unstyled ms-3">
        <li className="mb-1">
          {t('open_new_tab_kiva_auto_lending')}
        </li>
        <li className="mb-1">
          {t('check_auto_lending_turned_stop_if')}
        </li>
        <li className="mb-2">
          <Form.Check
            type="checkbox"
            checked={includePartners}
            onChange={(e) => setIncludePartners(e.target.checked)}
            label={
              <span>
                 {t('set_selected_total_partners_match', { selected: partnerIds.length, total: totalPartners })}
              </span>
            }
          />
        </li>
        <li className="mb-2">
          <Form.Check
            type="checkbox"
            checked={includeSectors}
            onChange={(e) => setIncludeSectors(e.target.checked)}
            label={
              <span>
                 {t('set_selected_total_sectors_match', { selected: sectors.length, total: totalSectors })}
              </span>
            }
          />
        </li>
        <li className="mb-2">
          <Form.Check
            type="checkbox"
            checked={includeCountries}
            onChange={(e) => setIncludeCountries(e.target.checked)}
            label={
              <span>
                 {t('set_selected_total_countries_match', { selected: countries.length, total: totalCountries })}
              </span>
            }
          />
        </li>
        <li>{t('save_new_settings')}</li>
      </ul>

      {problems.length > 0 && (
        <Alert variant="danger">
          {t('there_problems_preventing_continuing')}
          <ul className="mb-0 mt-1">
            {problems.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Button
        variant="primary"
        onClick={handlePush}
        disabled={problems.length > 0 || noneChecked}
      >
         {t('set_auto_lending_options_kiva')}
      </Button>
    </Container>
  )
}
