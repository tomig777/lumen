import { useEffect } from 'react'

/** Keep fixed app layers inside the visible area when iOS raises the keyboard. */
export function useMobileViewport() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0

    const update = () => {
      frame = 0
      root.style.setProperty('--lumen-viewport-height', `${Math.round(viewport?.height ?? window.innerHeight)}px`)
      root.style.setProperty('--lumen-viewport-top', `${Math.round(viewport?.offsetTop ?? 0)}px`)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    return () => {
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      if (frame) window.cancelAnimationFrame(frame)
      root.style.removeProperty('--lumen-viewport-height')
      root.style.removeProperty('--lumen-viewport-top')
    }
  }, [])
}
