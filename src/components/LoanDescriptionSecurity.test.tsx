// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LoanDescription from './LoanDescription'

afterEach(cleanup)

describe('loan description HTML', () => {
  it('keeps simple formatting and sanitizes again when the translation replaces the original', () => {
    const original = '<p>Hello <strong>lender</strong><br>next line</p><img src=x onerror="window.pwned=1">'
    const { container, rerender } = render(<LoanDescription html={original} />)
    expect(screen.getByText('lender', { selector: 'strong' })).toBeInTheDocument()
    expect(container.querySelector('br')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()

    const translation = '<p>Bonjour <em>prêteur</em></p>' +
      '<svg onload="window.pwned=1"></svg><script>window.pwned=1</script>' +
      '<style>body{display:none}</style><a href="javascript:alert(1)" onclick="window.pwned=1">lire</a>'
    rerender(<LoanDescription html={translation} />)
    expect(screen.getByText('prêteur', { selector: 'em' })).toBeInTheDocument()
    expect(container.querySelector('img, svg, script, style, a')).toBeNull()
    expect(container.innerHTML).not.toMatch(/onerror|onclick|javascript:|pwned/)
    expect(container).toHaveTextContent('lire')
  })
})
