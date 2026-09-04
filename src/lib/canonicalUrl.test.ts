import { describe, expect, it } from 'vitest'
import { canonicalRedirect, CANONICAL_HOST } from '../../server/canonicalUrl.mjs'

const req = (host: string | undefined, proto: string | undefined, url = '/') => ({
  headers: { host, 'x-forwarded-proto': proto },
  url,
})

describe('canonicalRedirect', () => {
  it('leaves https requests on the canonical host alone', () => {
    expect(canonicalRedirect(req('www.kivalens.org', 'https', '/#/search'))).toBeNull()
    expect(canonicalRedirect(req('www.kivalens.org', undefined, '/api/start'))).toBeNull()
  })

  it('upgrades plain http on any host to https on the same host', () => {
    expect(canonicalRedirect(req('www.kivalens.org', 'http', '/rss/x?y=1'))).toBe('https://www.kivalens.org/rss/x?y=1')
    expect(canonicalRedirect(req('kivalens.herokuapp.com', 'http'))).toBe('https://kivalens.herokuapp.com/')
  })

  it('sends the bare apex to www in one hop, over http or https, keeping the path', () => {
    expect(canonicalRedirect(req('kivalens.org', 'https', '/rss_click/kiva/1'))).toBe('https://www.kivalens.org/rss_click/kiva/1')
    expect(canonicalRedirect(req('kivalens.org', 'http', '/'))).toBe('https://www.kivalens.org/')
    expect(canonicalRedirect(req('KivaLens.org:443', 'https', '/'))).toBe('https://www.kivalens.org/')
  })

  it('leaves other https hosts alone', () => {
    expect(canonicalRedirect(req('kivalens.herokuapp.com', 'https'))).toBeNull()
    expect(canonicalRedirect(req('localhost:3000', undefined))).toBeNull()
  })

  it('does not redirect a request that carries no host', () => {
    expect(canonicalRedirect(req(undefined, 'http'))).toBeNull()
  })

  it('exposes the canonical host', () => {
    expect(CANONICAL_HOST).toBe('www.kivalens.org')
  })
})
