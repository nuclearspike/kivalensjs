/**
 * Failures the page handles itself, sent to the error collector.
 *
 * A failure the page absorbs (shown as "could not be read", or simply skipped)
 * never reaches the window's error handlers, so without this it leaves no trace:
 * after the release of 2026-10-14 every portfolio-balancing read failed for 29 hours,
 * and nothing was recorded until a lender filed an issue 26 hours in. reportError
 * dispatches an error event,
 * which src/lib/rum/errors.ts keeps, one row per message with a count.
 *
 * A message names the failure and the reason, never a lender, a loan id, an
 * address or a count, so one cause is one row however often it happens.
 */

/**
 * The reason in a few words: "HTTP 502" for a refused request, else the error's
 * first line. Never throws: it runs inside catch handlers, which must go on to
 * their own recovery whatever was thrown at them.
 */
export function reasonOf(error: unknown): string {
  try {
    const status = (error as { status?: unknown } | null)?.status
    if (typeof error === 'object' && Number.isInteger(status) && (status as number) >= 0 && (status as number) < 1000) return `HTTP ${status}`
    const message = (error as { message?: unknown } | null)?.message
    const text = typeof message === 'string' ? message : typeof error === 'string' ? error : ''
    return text.trim().split('\n', 1)[0].slice(0, 120) || 'unknown reason'
  } catch {
    return 'unknown reason'
  }
}

/** Report a failure the page handled itself. Never throws. */
export function reportProblem(message: string): void {
  try {
    const report = (globalThis as { reportError?: (e: unknown) => void }).reportError
    if (typeof report === 'function') report(new Error(message))
  } catch {
    // Reporting a problem must never become one.
  }
}
