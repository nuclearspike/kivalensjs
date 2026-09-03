import { useState } from 'react'
import { Container, Row, Col, Form, Button } from '../ui'
import { useI18n } from '../i18n'

interface OnNowLender {
  lender_id: string
  install: string
  uptime: string
  lender?: {
    name: string
    whereabouts: string
    loan_count: number
    member_since: string
    image?: { url: string }
  }
}

const ANON_IMAGE = 'https://www.kiva.org/img/s200/726677.jpg'

/**
 * Shows users currently on KivaLens (requires server-side stats endpoint with key).
 */
export default function OnNow() {
  const { t } = useI18n()
  const [key, setKey] = useState('')
  const [onNow] = useState<OnNowLender[]>([])
  const [on24Count] = useState(0)
  const [noResult, setNoResult] = useState(false)

  const refresh = async () => {
    // TODO: call GraphQL stats endpoint
    // const data = await fetch(...)
    // For now, just show placeholder
    setNoResult(true)
  }

  const getImg = (onL: OnNowLender) =>
    onL.lender?.image?.url ?? ANON_IMAGE

  return (
    <Container className="py-3">
      <Row className="mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label>{t('key')}</Form.Label>
            <Form.Control
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </Form.Group>
          <Button variant="primary" className="mt-2" onClick={refresh}>
            {t('go')}
          </Button>
        </Col>
        <Col>{noResult && <span>{t('invalid_key')}</span>}</Col>
      </Row>
      <Row>
        {onNow.map((onL) => (
          <Col sm={3} key={onL.install} className="mb-3">
            <img
              src={getImg(onL)}
              style={{ width: 200, height: 200, display: 'block' }}
              alt={onL.lender_id}
            />
            <dl className="row mt-2">
              <dt className="col-4">{t('lender')}</dt>
              <dd className="col-8">
                <a
                  href={`https://www.kiva.org/lender/${onL.lender_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {onL.lender_id}
                </a>
              </dd>
              <dt className="col-4">{t('install')}</dt>
              <dd className="col-8">{onL.install}</dd>
              <dt className="col-4">{t('uptime')}</dt>
              <dd className="col-8">{onL.uptime}</dd>
              <dt className="col-4">{t('name')}</dt>
              <dd className="col-8">{onL.lender?.name ?? ''}</dd>
              <dt className="col-4">{t('since')}</dt>
              <dd className="col-8">{onL.lender?.member_since ?? ''}</dd>
              <dt className="col-4">{t('location')}</dt>
              <dd className="col-8">{onL.lender?.whereabouts ?? ''}</dd>
              <dt className="col-4">{t('loans')}</dt>
              <dd className="col-8">{onL.lender?.loan_count ?? ''}</dd>
            </dl>
          </Col>
        ))}
      </Row>
      {on24Count > 0 && (
        <Row>
          <Col>{t('online_last_24_hours_count', { count: on24Count })}</Col>
        </Row>
      )}
    </Container>
  )
}
