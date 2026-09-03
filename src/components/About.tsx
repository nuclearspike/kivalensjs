import { Container, Tabs, Tab } from '../ui'
import { Link } from 'react-router-dom'
import { showLenderIDModal } from '../lib/showLenderIdModal'
import { useUtilsStore } from '../stores'
import { useI18n } from '../i18n'

function KivaLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a href={`https://www.kiva.org/${path}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function NewTabLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}

function EmailLink({
  subject,
  body,
  children,
}: {
  subject: string
  body: string
  children: React.ReactNode
}) {
  const href = `mailto:contact@kivalens.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  return <a href={href}>{children}</a>
}

export default function About() {
  const { t } = useI18n()
  const hasLenderId = Boolean(useUtilsStore((s) => s.lenderId))

  return (
    <Container className="py-3">
      <h1>{t('about_kivalens')}</h1>

      <Tabs defaultActiveKey="getting-started" id="about-tabs" className="mb-0 about-tabs">
        <Tab eventKey="getting-started" title={t('getting_started')}>
          <h3>{t('what_kivalens')}</h3>
          <p>
            {t('kivalens_free_tool_powerful_ways')}{' '}
            <KivaLink path="">Kiva.org</KivaLink>.{' '}
            {t('find_loans_country_sector_repayment')}
          </p>

          {!hasLenderId ? (
            <>
              <h3>{t('what_kiva')}</h3>
              <p>
                <KivaLink path="invitedby/nuclearspike">Kiva</KivaLink>{' '}
                {t('kiva_nonprofit_blurb')}
              </p>
            </>
          ) : null}

          <h3>{t('quick_start')}</h3>
          <ol className="spacedList">
            <li>
               {t('search_loans_use_search_tab')}
            </li>
            <li>
               {t('review_loan_click_any_loan')}
            </li>
            <li>
               {t('lend_click_lend_loans_like')}
            </li>
            <li>
               {t('check_out_kiva_go_basket')}
            </li>
          </ol>

          <h3>{t('set_up_lender_id')}</h3>
          <p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                showLenderIDModal()
              }}
            >
               {t('set_kiva_lender_id_3')}
            </a>{' '}
             {t('lender_id_benefit_hint')}
          </p>

          <h3>{t('save_searches')}</h3>
          <p>
            {t('found_useful_set_filters_save')}{' '}
            <Link to="/saved">{t('saved')}</Link> {t('tab')}
          </p>
        </Tab>

        <Tab eventKey="advanced" title={t('advanced')}>
          <h3>{t('sorting_filtering_repayment')}</h3>
          <p>
            {t('kiva_sorts_repayment_terms_which')}
          </p>

          <h3>{t('any_all_none_filtering')}</h3>
          <p>
            {t('fields_multiple_values_choose_any')}
          </p>

          <h3>{t('portfolio_balancing')}</h3>
          <p>
            {t('use_portfolio_criteria_tab_balance')}
          </p>

          <h3>{t('partners_tab')}</h3>
          <p>
            {t('browse_active_closed_paused_kiva')}
          </p>

          <h3>{t('team_research')}</h3>
          <p>
            {t('partner_detail_research_credit')}{' '}
            <KivaLink path="team/aplus">A+ Team</KivaLink>.{' '}
            {t('includes_secular_social_ratings_plus')}
          </p>

          <h3>{t('rss_feeds')}</h3>
          <p>
            {t('set_criteria_use_rss_tab')}{' '}
            <NewTabLink href="https://www.ifttt.com">IFTTT</NewTabLink>{' '}
            {t('notify_on_new_matches_hint')}
          </p>

          <h3>{t('reducing_risk')}</h3>
          <ul className="spacedList">
            <li>
               {t('risk_rating_kivas_assessment_partner')}
            </li>
            <li>
               {t('currency_exchange_risk_exchange_rate')}
            </li>
            <li>
               {t('default_rates_all_partners_have')}
            </li>
            <li>
               {t('portfolio_yield_interest_fees_charged')}
            </li>
            <li>
               {t('diversify_spread_lending_across_partners')}
            </li>
            <li>
               {t('repeat_borrowers_returning_borrower')}
            </li>
          </ul>

          <h3>{t('questions_problems')}</h3>
          <p>
             {t('data_comes')}{' '}
             <NewTabLink href="https://build.kiva.org/api">
              {t('kivas_public_api')}
            </NewTabLink>
             . {t('questions_about_loan_data_contact')}{' '}
            <KivaLink path="help">{t('kivas_help_center')}</KivaLink>. {t('kivalens_bugs')}{' '}
            <NewTabLink href="https://github.com/nuclearspike/kivalens/issues">
               {t('open_issue_github')}
            </NewTabLink>{' '}
             {t('or')}{' '}
            <EmailLink
               subject={t('kivalens_bug')}
              body={t('bug_report_template')}
            >
               {t('email_me')}
            </EmailLink>
             . {t('join')}{' '}
            <KivaLink path="team/kivalens">{t('kivalens_lending_team')}</KivaLink> {t('discussion_announcements')}
          </p>
          <p>
             {t('kivalens_open_source')}{' '}
            <NewTabLink href="https://github.com/nuclearspike/kivalens">
               {t('browse_code_github')}
            </NewTabLink>
            .
          </p>
        </Tab>
      </Tabs>
    </Container>
  )
}
