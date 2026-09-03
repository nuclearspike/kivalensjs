import { Container } from '../ui'
import { useI18n } from '../i18n'

export function Component() {
  const { t } = useI18n()
  return (
    <Container className="py-4">
      <h2>{t('coming_soon')}</h2>
      <p>{t('section_under_construction')}</p>
    </Container>
  )
}
