import { describe, expect, it } from 'vitest'
import { buildDigestHtml, bugReports, subjectSuffix } from '../../server/digest.mjs'

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

/**
 * Most users have no GitHub account, so the chat is their only way to report a
 * problem. A report rendered like every other turn gets missed — one "my saved
 * searches are gone" report sat inside a 103-chat digest looking exactly like
 * "can you make them pink". These pin that it is hoisted and counted.
 */
const bug = (args: unknown, o: Record<string, unknown> = {}) =>
  turn({
    userMessage: 'my saved searches are gone',
    // The pipeline stores tool args as a JSON STRING, truncated to 300 chars.
    tools: [{ name: 'report_bug', args: typeof args === 'string' ? args : JSON.stringify(args) }],
    ...o,
  })

describe('digest — bug reports', () => {
  it('finds turns where a report was filed', () => {
    const logs = [turn(), bug({ summary: 'saved searches vanished' }), turn()]
    expect(bugReports(logs)).toHaveLength(1)
  })

  it('ignores ordinary turns', () => {
    expect(bugReports([turn(), turn({ tools: [{ name: 'set_criteria' }] })])).toHaveLength(0)
  })

  it('hoists a report into its own section with the details', () => {
    const html = buildDigestHtml('2026-08-13', [
      bug({ summary: 'saved searches vanished', actual: 'list is empty', expected: 'my 6 searches', where: 'Saved page' }),
    ])
    expect(html).toContain('1 bug report(s)')
    expect(html).toContain('saved searches vanished')
    expect(html).toContain('list is empty')
    expect(html).toContain('Saved page')
  })

  it('puts the section ABOVE the per-user log so it cannot be missed', () => {
    const html = buildDigestHtml('2026-08-13', [
      turn({ clientId: 'zzz', userMessage: 'find me vegan loans' }),
      bug({ summary: 'basket cleared itself' }, { clientId: 'aaa' }),
    ])
    expect(html.indexOf('bug report(s)')).toBeLessThan(html.indexOf('User zzz'))
  })

  it('labels the reporter by lender when known', () => {
    const html = buildDigestHtml('2026-08-13', [bug({ summary: 'x' }, { lenderId: 'david89779370' })])
    expect(html).toContain('lender david89779370')
  })

  it('falls back to the user’s own words when the args were truncated mid-JSON', () => {
    // 300-char truncation can leave unparseable JSON; the report must still show.
    const html = buildDigestHtml('2026-08-13', [bug('{"summary":"the basket lost my loa')])
    expect(html).toContain('1 bug report(s)')
    expect(html).toContain('my saved searches are gone')
  })

  it('escapes hostile text inside a report', () => {
    const html = buildDigestHtml('2026-08-13', [bug({ summary: '<script>alert(1)</script>' })])
    expect(html).not.toContain('<script>')
  })

  it('adds nothing when there are no reports', () => {
    const html = buildDigestHtml('2026-08-13', [turn()])
    expect(html).not.toContain('bug report(s)')
  })

  it.each([
    [0, ''],
    [1, ', 1 bug report'],
    [2, ', 2 bug reports'],
  ])('subject suffix for %i report(s)', (n, expected) => {
    const logs = [turn(), ...Array.from({ length: n as number }, () => bug({ summary: 's' }))]
    expect(subjectSuffix(logs)).toBe(expected)
  })
})
