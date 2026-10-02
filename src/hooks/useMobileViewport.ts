import { useEffect } from 'react'
import { observeEditorViewport } from '../mobileViewport'

/** Leave the full-screen shell alone; only an active editor follows the keyboard. */
export function useMobileViewport() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    return observeEditorViewport(window)
  }, [])
}
