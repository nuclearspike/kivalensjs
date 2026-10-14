import { useMemo } from 'react'
import DOMPurify from 'dompurify'

/** Kiva descriptions and AI translations are untrusted HTML. Keep only their text formatting. */
export default function LoanDescription({ html }: { html: string }) {
  const safeHtml = useMemo(() => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  }), [html])

  return <div className="loan-description" dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
