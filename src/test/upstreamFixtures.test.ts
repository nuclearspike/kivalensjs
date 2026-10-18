import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { recorded } from './upstream'

/**
 * What the recorded answers say about Kiva and Google, as the code relies on it.
 * When a fresh recording breaks one of these, the upstream has changed: the code
 * that reads it needs looking at before the test is touched.
 */
describe('recorded upstream answers', () => {
  const names = readdirSync(path.join(process.cwd(), 'src/test/fixtures/upstream')).filter((n) => n.endsWith('.json'))

  it('say when and how they were recorded, and carry no lender id', () => {
    expect(names.length).toBeGreaterThanOrEqual(6)
    for (const name of names) {
      const r = recorded(name)
      expect(Number.isNaN(Date.parse(r.recordedAt)), name).toBe(false)
      expect(r.source, name).toMatch(/^https:\/\//)
      expect(r.how, name).toBeTruthy()
      expect(r.source, name).not.toMatch(/subject_id=(?!<lender>)/)
    }
  })

  it('Kiva sends the JSON of its graph calls labelled text/html', () => {
    for (const name of ['kiva-supergraph-partner-all.json', 'kiva-supergraph-country-active-empty.json', 'kiva-graphdata-team.json']) {
      const r = recorded(name)
      expect(r.status, name).toBe(200)
      expect(r.headers?.['content-type'], name).toMatch(/^text\/html/)
      expect(() => JSON.parse(r.body ?? ''), name).not.toThrow()
    }
  })

  it('Kiva answers a slice the lender has no loans in with an error object, as JSON', () => {
    expect(JSON.parse(recorded('kiva-supergraph-country-active-empty.json').body!)).toEqual({ error: 'Could not retrieve stats.' })
  })

  it('Kiva’s listing has no terms, story or borrowers; its detail for the same loans has all three', () => {
    const listed = recorded('kiva-search-page.json').loans!
    const details = recorded('kiva-loan-details.json').loans!
    expect(details.map((d) => d.id).sort()).toEqual(listed.map((l) => l.id).sort())
    for (const l of listed) {
      expect(l).not.toHaveProperty('terms')
      expect(l).not.toHaveProperty('borrowers')
      expect((l.description as { texts?: unknown }).texts).toBeUndefined()
    }
    for (const d of details) {
      expect(d.terms).toEqual(expect.objectContaining({ scheduled_payments: expect.any(Array) }))
      expect(Array.isArray(d.borrowers)).toBe(true)
      expect((d.description as { texts: { en: string } }).texts.en.length).toBeGreaterThan(0)
    }
  })

  it('Google sends the research sheet as CSV after a redirect to its content host', () => {
    const r = recorded('google-sheet-export.json')
    expect(r.redirect?.status).toBeGreaterThanOrEqual(301)
    expect(new URL(r.redirect!.location).hostname).toMatch(/^doc-[a-z0-9-]+-sheets\.googleusercontent\.com$/)
    expect(r.headers?.['content-type']).toMatch(/^text\/csv/)
    expect(r.body).toMatch(/^ID,/)
  })
})
