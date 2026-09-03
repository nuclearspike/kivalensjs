import { Container, Card } from '../ui'
import { useI18n } from '../i18n'

function NewTabLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  )
}

function DonateItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-3">
      <Card.Header>{title}</Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card>
  )
}

export default function Donate() {
  const { t } = useI18n()
  return (
    <Container className="py-3">
      <h1>{t('donate')}</h1>
      <h4>{t('kivalens_now_always_free_use')}</h4>

      <DonateItem title={t('paypal')}>
        <NewTabLink className="btn btn-outline-secondary" href="https://paypal.me/nuclearspike">
          {t('paypal_me')}
        </NewTabLink>{' '}
        {t('youre_already_using_paypal_kiva')}
      </DonateItem>

      <DonateItem title={t('kiva_gift_card')}>
        <NewTabLink
          className="btn btn-outline-secondary"
          href="https://www.kiva.org/gifts/kiva-cards?handle=nuclearspike#/lender"
        >
          {t('send_kiva_gift_card')}
        </NewTabLink>
      </DonateItem>

      <DonateItem title={t('amazon_wishlist')}>
        <NewTabLink
          className="btn btn-outline-secondary"
          href="http://www.amazon.com/registry/wishlist/3NRDPJN4K2FS2"
        >
          {t('buy_something_my_wishlist')}
        </NewTabLink>
      </DonateItem>
    </Container>
  )
}
