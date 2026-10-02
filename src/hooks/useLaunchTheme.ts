import { useLayoutEffect } from 'react'

/** Release the critical first-paint theme only after the real screen exists.
 * Do not guess native status-icon colours or override later light/dark pages.
 * No storage, timers, viewport changes, or persistent installation changes. */
export function useLaunchTheme(ready: boolean) {
  useLayoutEffect(() => {
    if (ready) document.documentElement.removeAttribute('data-lumen-launch')
  }, [ready])
}
