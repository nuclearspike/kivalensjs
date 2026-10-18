import { afterEach, describe, expect, it } from 'vitest'
import { reasonOf, reportProblem } from './reportProblem'
import { HttpStatusError } from '../api/kivajs/kivaBase'

afterEach(() => {
  delete (globalThis as { reportError?: unknown }).reportError
})

describe('reportProblem', () => {
  it('hands the error collector an Error with the message as given', () => {
    const seen: unknown[] = []
    ;(globalThis as { reportError?: (e: unknown) => void }).reportError = (e) => seen.push(e)
    reportProblem('Reading portfolio figures from Kiva failed: HTTP 502')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toBeInstanceOf(Error)
    expect((seen[0] as Error).message).toBe('Reading portfolio figures from Kiva failed: HTTP 502')
  })

  it('never throws: not with no collector, and not when the collector throws', () => {
    expect(() => reportProblem('x')).not.toThrow()
    ;(globalThis as { reportError?: (e: unknown) => void }).reportError = () => {
      throw new Error('collector broke')
    }
    expect(() => reportProblem('x')).not.toThrow()
  })
})

describe('reasonOf', () => {
  it('gives the status of a refused request, and the first line of anything else', () => {
    expect(reasonOf(new HttpStatusError(502))).toBe('HTTP 502')
    expect(reasonOf(new Error('Failed to fetch\nat somewhere'))).toBe('Failed to fetch')
    expect(reasonOf('timeout')).toBe('timeout')
    expect(reasonOf(new Error(''))).toBe('unknown reason')
    expect(reasonOf(new Error('x'.repeat(300)))).toHaveLength(120)
  })

  it('reads what a rejection can carry that is not an Error, and never says "null" or "[object Object]"', () => {
    expect(reasonOf({ status: 404, statusText: 'Not Found' })).toBe('HTTP 404')
    expect(reasonOf({ message: 'The operation was aborted.' })).toBe('The operation was aborted.')
    expect(reasonOf(new Error('\n  Failed to fetch\nstack'))).toBe('Failed to fetch')
    for (const nothing of [null, undefined, {}, { status: '502' }, 42]) expect(reasonOf(nothing)).toBe('unknown reason')
  })

  it('never throws, and reads no status that is not a whole number', () => {
    const hostile = Object.defineProperty({}, 'status', { get: () => { throw new Error('getter broke') } })
    expect(reasonOf(hostile)).toBe('unknown reason')
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()
    expect(reasonOf(proxy)).toBe('unknown reason')
    expect(reasonOf({ status: Number.NaN, message: 'Load failed' })).toBe('Load failed')
  })
})
