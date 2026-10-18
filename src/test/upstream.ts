/**
 * Real answers from Kiva and Google, recorded by scripts/record-upstream-fixtures.mjs.
 * Tests of code that talks to them build their upstream from these, never from an
 * idea of what the other side sends.
 */
export interface Recorded {
  recordedAt: string
  source: string
  how: string
  status?: number
  headers?: Record<string, string>
  body?: string
  loans?: Array<Record<string, unknown> & { id: number }>
  redirect?: { status: number; location: string }
  cut?: string
}

const FIXTURES = import.meta.glob<Recorded>('./fixtures/upstream/*.json', { eager: true, import: 'default' })

export function recorded(name: string): Recorded {
  const r = FIXTURES[`./fixtures/upstream/${name}`]
  if (!r) throw new Error(`No recorded answer named ${name} in src/test/fixtures/upstream/`)
  // A copy each time: a test may fill in or change what it was given.
  return structuredClone(r)
}

/** The recorded answer as a fetch Response: its status, its headers and its body. */
export function recordedResponse(name: string): Response {
  const r = recorded(name)
  return new Response(r.body ?? '', { status: r.status ?? 200, headers: r.headers ?? {} })
}
