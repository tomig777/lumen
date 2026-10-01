import { useEffect } from 'react'
import { editorViewportFrame } from '../mobileViewport'

/** Leave the full-screen shell alone; only an active editor follows the keyboard. */
export function useMobileViewport() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const root = document.documentElement
    const viewport = window.visualViewport
    let frame = 0

    const reset = () => {
      root.removeAttribute('data-lumen-keyboard')
      root.style.removeProperty('--lumen-editor-height')
      root.style.removeProperty('--lumen-editor-top')
    }
    const update = () => {
      frame = 0
      const app = document.querySelector('.deployed-app-root')
      const active = document.activeElement
      const textInput = active instanceof HTMLInputElement
        && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(active.type)
        && !active.readOnly
      const textArea = active instanceof HTMLTextAreaElement && !active.readOnly
      const editing = document.visibilityState !== 'hidden' && !!app?.contains(active)
        && (textInput || textArea || (active instanceof HTMLElement && active.isContentEditable))
      if (!editing || !viewport) { reset(); return }
      const bounds = app?.getBoundingClientRect()
      const editor = bounds ? editorViewportFrame({
        editing,
        layoutTop: bounds.top,
        layoutHeight: bounds.height,
        visualTop: viewport.offsetTop,
        visualHeight: viewport.height,
        scale: viewport.scale,
      }) : null
      if (!editor) { reset(); return }
      root.style.setProperty('--lumen-editor-height', `${editor.height}px`)
      root.style.setProperty('--lumen-editor-top', `${editor.top}px`)
      root.setAttribute('data-lumen-keyboard', 'open')
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    window.addEventListener('resize', schedule)
    window.addEventListener('orientationchange', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('orientationchange', schedule)
      window.removeEventListener('pageshow', schedule)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
      document.removeEventListener('visibilitychange', schedule)
      if (frame) window.cancelAnimationFrame(frame)
      reset()
    }
  }, [])
}
