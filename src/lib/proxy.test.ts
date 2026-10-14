import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleProxy } from '../../server/klCore.mjs'

/** The proxy serves only the Kiva graph calls and KivaLens's one research sheet. */

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const get = (path: string, method = 'GET') => new Request(`http://localhost${path}`, { method })

describe('handleProxy', () => {
  it('declines a route that is not a proxy', async () => {
    expect(await handleProxy(get('/api/start'))).toBeNull()
  })

  it('allows only GET, and only the allowed paths', async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
    expect((await handleProxy(get('/proxy/kiva/ajax/x', 'POST')))!.status).toBe(405)
    expect((await handleProxy(get('/proxy/kiva/lend/123')))!.status).toBe(403)
    expect((await handleProxy(get('/proxy/gdocs/document/d/1')))!.status).toBe(403)
    expect((await handleProxy(get('/proxy/gdocs/spreadsheets/d/attacker/export')))!.status).toBe(403)
    expect((await handleProxy(get('/proxy/kiva/ajax/otherEndpoint')))!.status).toBe(403)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('asks Kiva the way its firewall accepts and passes the answer back', async () => {
    const fetchMock = vi.fn(async () => new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const res = (await handleProxy(get('/proxy/kiva/ajax/getSuperGraphData?id=1')))!
    expect(fetchMock).toHaveBeenCalledWith('https://www.kiva.org/ajax/getSuperGraphData?id=1', expect.objectContaining({
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: 'https://www.kiva.org/',
      },
      signal: expect.any(AbortSignal),
    }))
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await res.text()).toBe('{"ok":true}')
  })

  it('rejects a Kiva redirect outside the allowed endpoint before fetching it', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      init?.redirect === 'manual'
        ? new Response(null, { status: 302, headers: { Location: 'http://169.254.169.254/latest/meta-data/' } })
        : new Response('private metadata', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get('/proxy/kiva/ajax/getGraphData?id=1')))!
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://www.kiva.org/ajax/getGraphData?id=1', expect.objectContaining({ redirect: 'manual' }))
  })

  it('rejects a redirect without waiting for a stalled body cancellation', async () => {
    vi.useFakeTimers()
    const stream = new ReadableStream<Uint8Array>({
      cancel() { return new Promise<void>(() => {}) },
    })
    const fetchMock = vi.fn(async () => new Response(stream, {
      status: 302,
      headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
    }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    let response: Response | null | undefined
    try {
      void handleProxy(get('/proxy/kiva/ajax/getGraphData?id=1')).then((res) => { response = res })
      await vi.advanceTimersByTimeAsync(1)
      expect(response?.status).toBe(502)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('follows only the research sheet export redirect to its Google content host', async () => {
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    const googleContent = `https://doc-0c-9c-sheets.googleusercontent.com/export/token1/token2/1792013045000/123456/*/${sheetId}?gid=1&format=csv`
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 307, headers: { Location: googleContent } }))
      .mockResolvedValueOnce(new Response('id,name\n', { status: 200, headers: { 'Content-Type': 'text/csv' } }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('id,name\n')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(2, googleContent, expect.objectContaining({ redirect: 'manual' }))
  })

  it('rejects a sheet redirect to another document on the same content host', async () => {
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    const fetchMock = vi.fn(async () => new Response(null, {
      status: 307,
      headers: { Location: 'https://doc-0c-9c-sheets.googleusercontent.com/export/token1/token2/1792013045000/123456/*/different-sheet?gid=1&format=csv' },
    }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a Google content redirect to a nonstandard port', async () => {
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 307,
        headers: { Location: `https://doc-0c-9c-sheets.googleusercontent.com:8443/export/token1/token2/1792013045000/123456/*/${sheetId}?gid=1&format=csv` },
      }))
      .mockResolvedValueOnce(new Response('unexpected', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a Google content redirect outside the export path shape', async () => {
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 307,
        headers: { Location: `https://doc-0c-9c-sheets.googleusercontent.com/export/unrestricted/path/${sheetId}?gid=1&format=csv` },
      }))
      .mockResolvedValueOnce(new Response('unexpected', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('passes an upstream error status through', async () => {
    globalThis.fetch = vi.fn(async () => new Response('gone', { status: 404, headers: { 'Content-Type': 'text/plain' } })) as unknown as typeof fetch
    const res = (await handleProxy(get('/proxy/gdocs/spreadsheets/d/1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0/export?gid=1&format=csv')))!
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('gone')
  })

  it('passes a status that has no body through, instead of failing on it', async () => {
    for (const status of [204, 205, 304]) {
      globalThis.fetch = vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch
      const res = (await handleProxy(get('/proxy/kiva/ajax/getGraphData')))!
      expect(res.status).toBe(status)
      expect(res.body).toBeNull()
    }
  })

  it('refuses an upstream body over the 4 MiB bound, even when length is undeclared', async () => {
    let canceled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)) },
      cancel() { canceled = true },
    })
    globalThis.fetch = vi.fn(async () => new Response(stream, { status: 200 })) as unknown as typeof fetch
    const res = (await handleProxy(get('/proxy/kiva/ajax/getGraphData')))!
    expect(res.status).toBe(502)
    expect(canceled).toBe(true)
  })

  it('answers 502 when Kiva cannot be reached', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    globalThis.fetch = vi.fn(async () => { throw new Error('ECONNRESET') }) as unknown as typeof fetch
    const res = (await handleProxy(get('/proxy/kiva/ajax/getGraphData')))!
    expect(res.status).toBe(502)
    expect(await res.text()).toBe('Proxy error')
  })
})
