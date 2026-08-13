import { describe, expect, it } from 'vitest'
import { buildDigestHtml } from '../../server/digest.mjs'

/**
 * The daily digest emails real user chat turns to the operator. It embeds
 * user-supplied text, so escaping is a security property, not cosmetics.
 */

const turn = (o: Record<string, unknown> = {}) => ({
  at: '2026-08-13T10:00:00Z',
  clientId: 'c1',
  userMessage: 'find me vegan loans',
  response: 'Here you go.',
  tools: [],
  costUsd: 0.001,
  ...o,
})

describe('buildDigestHtml', () => {
  it('summarizes interaction, user and cost totals', () => {
    const html = buildDigestHtml('2026-08-13', [
      turn({ clientId: 'a', costUsd: 0.01 }),
      turn({ clientId: 'b', costUsd: 0.02 }),
      turn({ clientId: 'b', costUsd: 0.03 }),
    ])
    expect(html).toContain('3 interactions')
    expect(html).toContain('2 users')
    expect(html).toContain('$0.0600')
  })

  it('groups turns by user and labels the lender when known', () => {
    const html = buildDigestHtml('2026-08-13', [
      turn({ clientId: 'c1', lenderId: 'jmcgimpsey' }),
      turn({ clientId: 'c2' }),
    ])
    expect(html).toContain('lender jmcgimpsey')
    expect(html).toContain('User c1')
    expect(html).toContain('User c2')
  })

  it('falls back to anonymous when there is no id at all', () => {
    const html = buildDigestHtml('2026-08-13', [turn({ clientId: null, lenderId: null })])
    expect(html).toContain('anonymous')
  })

  it('escapes HTML in user-supplied text (no script injection)', () => {
    const html = buildDigestHtml('2026-08-13', [
      turn({ userMessage: '<script>alert(1)</script>', response: '<img src=x onerror=alert(2)>' }),
    ])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes a hostile client id too', () => {
    const html = buildDigestHtml('2026-08-13', [turn({ clientId: '<b>bold</b>' })])
    expect(html).not.toContain('<b>bold</b>')
  })

  it('handles a day with no activity', () => {
    const html = buildDigestHtml('2026-08-13', [])
    expect(html).toContain('0 interactions')
    expect(html).toContain('$0.0000')
  })

  it('tolerates turns with no cost recorded', () => {
    const html = buildDigestHtml('2026-08-13', [turn({ costUsd: undefined })])
    expect(html).toContain('$0.0000')
  })

  it('lists the tools a turn used', () => {
    const html = buildDigestHtml('2026-08-13', [
      turn({ tools: [{ name: 'set_criteria' }, { name: 'analyze_loans' }] }),
    ])
    expect(html).toContain('set_criteria')
    expect(html).toContain('analyze_loans')
  })
})
