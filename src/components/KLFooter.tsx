import { Container, Row, Col } from '../ui'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function KLFooter() {
  const { t } = useI18n()
  return (
    <Container>
      <Row style={{ paddingTop: 20, paddingBottom: 50 }}>
        <Col md={12} className="pt-4 text-center">
          &copy;{new Date().getFullYear()} {t('kivalens_not_supported_kiva_org')}{' '}
          <Link to="/about">{t('about')}</Link> {t('contact_information')} ·{' '}
          <Link to="/privacy">{t('privacy')}</Link>
        </Col>
      </Row>
    </Container>
  )
}
