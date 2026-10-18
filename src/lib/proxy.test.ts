import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleProxy } from '../../server/klCore.mjs'
import { recorded, recordedResponse } from '../test/upstream'

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
    // Kiva's real answer, label and all (src/test/fixtures/upstream).
    const fetchMock = vi.fn(async () => recordedResponse('kiva-supergraph-partner-all.json'))
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
    expect(await res.text()).toBe(recorded('kiva-supergraph-partner-all.json').body)
  })

  it('passes on Kiva’s JSON, which Kiva labels text/html, as JSON', async () => {
    // Issue #74: every portfolio-balancing read and team graph answered 502 while Kiva answered 200 with data.
    for (const [path, name] of [
      ['/proxy/kiva/ajax/getSuperGraphData?sliceBy=partner&include=all', 'kiva-supergraph-partner-all.json'],
      ['/proxy/kiva/ajax/getGraphData?graphName=team_loan_count&id=1', 'kiva-graphdata-team.json'],
    ]) {
      globalThis.fetch = vi.fn(async () => recordedResponse(name)) as unknown as typeof fetch
      const res = (await handleProxy(get(path)))!
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(await res.text()).toBe(recorded(name).body)
    }
  })

  it('passes on Kiva’s own answer for an empty slice, which is JSON too: the caller reads it', async () => {
    globalThis.fetch = vi.fn(async () => recordedResponse('kiva-supergraph-country-active-empty.json')) as unknown as typeof fetch
    const res = (await handleProxy(get('/proxy/kiva/ajax/getSuperGraphData?sliceBy=country&include=active')))!
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('{"error":"Could not retrieve stats."}')
  })

  it('refuses a successful Kiva answer that is not JSON, whatever its label, and says so in the server log without the query', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      for (const [body, type] of [['<h1>Sign in</h1>', 'text/html; charset=utf-8'], ['<h1>Sign in</h1>', 'application/json'], ['', 'application/json'], ['{"cut', 'application/json']]) {
        globalThis.fetch = vi.fn(async () => new Response(body, { status: 200, headers: { 'Content-Type': type } })) as unknown as typeof fetch
        const res = (await handleProxy(get('/proxy/kiva/ajax/getSuperGraphData?subject_id=somelender&id=1')))!
        expect(res.status).toBe(502)
        expect(await res.text()).toBe('Proxy upstream did not return data')
      }
      expect(warn).toHaveBeenCalledTimes(4)
      expect(String(warn.mock.calls[0][0])).toBe('[proxy] refused /proxy/kiva/ajax/getSuperGraphData: Proxy upstream did not return data (upstream 200 text/html, not JSON)')
      for (const call of warn.mock.calls) expect(String(call[0])).not.toContain('somelender')
    } finally {
      warn.mockRestore()
    }
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
    // Google's real redirect and answer; the recording replaced the tokens and account number, put back here.
    const sheet = recorded('google-sheet-export.json')
    const googleContent = sheet.redirect!.location.replace(/<token>/g, 'tok3n').replace('<number>', '123456')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: sheet.redirect!.status, headers: { Location: googleContent } }))
      .mockResolvedValueOnce(recordedResponse('google-sheet-export.json'))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(sheet.body)
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

  it('does not promote upstream HTML to a same-origin document', async () => {
    const html = '<h1>Upstream error</h1>'
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    for (const [path, expectedType] of [
      ['/proxy/kiva/ajax/getGraphData?id=1', 'application/json; charset=utf-8'],
      [`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`, 'text/csv; charset=utf-8'],
    ]) {
      globalThis.fetch = vi.fn(async () => new Response(html, {
        status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })) as unknown as typeof fetch
      const res = (await handleProxy(get(path)))!
      expect(res.status).toBe(503)
      expect(res.headers.get('content-type')).toBe(expectedType)
      expect(await res.text()).toBe(html)
    }
  })

  it('rejects a successful upstream HTML page so data callers can recover', async () => {
    const html = '<h1>Sign in</h1>'
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    for (const path of [
      '/proxy/kiva/ajax/getGraphData?id=1',
      `/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`,
    ]) {
      globalThis.fetch = vi.fn(async () => new Response(html, {
        status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })) as unknown as typeof fetch
      const res = (await handleProxy(get(path)))!
      expect(res.status).toBe(502)
      expect(await res.text()).not.toContain(html)
    }
  })

  it('rejects an HTML page after an approved sheet redirect', async () => {
    const sheetId = '1KP7ULBAyavnohP4h8n2J2yaXNpIRnyIXdjJj_AwtwK0'
    const googleContent = `https://doc-0c-9c-sheets.googleusercontent.com/export/token1/token2/1792013045000/123456/*/${sheetId}?gid=1&format=csv`
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 307, headers: { Location: googleContent } }))
      .mockResolvedValueOnce(new Response('<h1>Sign in</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const res = (await handleProxy(get(`/proxy/gdocs/spreadsheets/d/${sheetId}/export?gid=1&format=csv`)))!
    expect(res.status).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(2, googleContent, expect.objectContaining({ redirect: 'manual' }))
  })

  it('lets the A+ sheet helper recover from a successful upstream HTML page', async () => {
    vi.stubGlobal('location', { protocol: 'https:', host: 'www.kivalens.org' })
    try {
      const { req } = await import('../api/kivajs/req')
      const csv = 'id,secularRating\n1,5\n'
      let googleRequests = 0
      const fetchMock = vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.startsWith('https://www.kivalens.org/proxy/gdocs/'))
          return (await handleProxy(new Request(url)))!
        if (url.startsWith('https://docs.google.com/')) {
          googleRequests++
          return googleRequests === 1
            ? new Response('<h1>Sign in</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })
            : new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv' } })
        }
        throw new Error(`Unexpected fetch: ${url}`)
      }) as unknown as typeof fetch
      globalThis.fetch = fetchMock

      expect(await req.gdocs.atheist.get()).toBe(csv)
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(googleRequests).toBe(2)
    } finally {
      vi.unstubAllGlobals()
    }
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
