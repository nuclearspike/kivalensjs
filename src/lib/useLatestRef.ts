import { useRef, useLayoutEffect } from 'react'

/**
 * Keeps a ref pointing at the latest `value`. Updated via a layout effect
 * rather than during render or a passive effect, because those are two
 * different timing tiers with a real gap between them: a render-time state
 * adjustment (the "adjust state during render on a tracked transition"
 * pattern) commits before paint, while a passive `useEffect`'s cleanup —
 * the usual place to invalidate an in-flight async operation — is deferred
 * until after paint. Anything that can settle in that gap (an
 * already-cached promise resolving via microtask, a setInterval tick from
 * an old effect instance) can still see a plain `cancelled` flag as false
 * and reapply data a render-time reset already cleared. A layout effect
 * closes the gap: it runs at the same synchronous timing as the render-time
 * reset, so a ref it maintains is trustworthy read from either an async
 * callback or a later passive effect.
 *
 * Not a replacement for a real AbortController/cancellation token when one
 * is available — it's for the common case here, where the only signal an
 * async operation has to check against is "does this still match what the
 * component currently wants."
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
