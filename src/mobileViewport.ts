export type EditorViewportMetrics = {
  editing: boolean
  layoutTop: number
  layoutHeight: number
  visualTop: number
  visualHeight: number
  scale: number
}

/** Constrain an editor, not the app shell, when an unzoomed keyboard obscures it. */
export function editorViewportFrame(metrics: EditorViewportMetrics): { top: number; height: number } | null {
  const { editing, layoutTop, layoutHeight, visualTop, visualHeight, scale } = metrics
  if (!editing || ![layoutTop, layoutHeight, visualTop, visualHeight, scale].every(Number.isFinite)) return null
  if (layoutHeight <= 0 || visualHeight <= 0 || Math.abs(scale - 1) > .01) return null

  const top = Math.max(layoutTop, visualTop)
  const bottom = Math.min(layoutTop + layoutHeight, visualTop + visualHeight)
  const height = bottom - top
  // A safe-area/browser-chrome difference alone must not be mistaken for a keyboard.
  if (height <= 0 || layoutHeight - height < Math.max(100, layoutHeight * .15)) return null
  return { top: Math.round(top - layoutTop), height: Math.floor(height) }
}

/** Observe keyboard geometry without ever assigning an app/document height. */
export function observeEditorViewport(win: Window): () => void {
  const doc = win.document
  const root = doc.documentElement
  const viewport = win.visualViewport
  let frame = 0
  const reset = () => {
    root.removeAttribute('data-lumen-keyboard')
    root.style.removeProperty('--lumen-editor-height')
    root.style.removeProperty('--lumen-editor-top')
  }
  const update = () => {
    frame = 0
    const app = doc.querySelector('.deployed-app-root')
    const active = doc.activeElement
    // Tag checks also work for isolated frames (their DOM constructors differ).
    const input = active?.tagName === 'INPUT' ? active as HTMLInputElement : null
    const textarea = active?.tagName === 'TEXTAREA' ? active as HTMLTextAreaElement : null
    const editableInput = input && !input.readOnly && !input.disabled
      && ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(input.type)
    const editing = doc.visibilityState !== 'hidden' && !!active && !!app?.contains(active)
      && !!(editableInput || (textarea && !textarea.readOnly && !textarea.disabled)
        || (active as HTMLElement).isContentEditable)
    const bounds = app?.getBoundingClientRect()
    const editor = editing && viewport && bounds ? editorViewportFrame({
      editing, layoutTop: bounds.top, layoutHeight: bounds.height,
      visualTop: viewport.offsetTop, visualHeight: viewport.height, scale: viewport.scale,
    }) : null
    if (!editor) { reset(); return }
    root.style.setProperty('--lumen-editor-height', `${editor.height}px`)
    root.style.setProperty('--lumen-editor-top', `${editor.top}px`)
    root.setAttribute('data-lumen-keyboard', 'open')
  }
  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(update)
  }
  const suspend = () => {
    if (frame) win.cancelAnimationFrame(frame)
    frame = 0
    reset()
  }
  const visibility = () => doc.visibilityState === 'hidden' ? suspend() : schedule()
  const windowEvents = ['resize', 'orientationchange', 'pageshow'] as const
  const focusEvents = ['focusin', 'focusout'] as const
  update()
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  windowEvents.forEach((name) => win.addEventListener(name, schedule))
  focusEvents.forEach((name) => doc.addEventListener(name, schedule))
  win.addEventListener('pagehide', suspend)
  doc.addEventListener('visibilitychange', visibility)
  return () => {
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    windowEvents.forEach((name) => win.removeEventListener(name, schedule))
    focusEvents.forEach((name) => doc.removeEventListener(name, schedule))
    win.removeEventListener('pagehide', suspend)
    doc.removeEventListener('visibilitychange', visibility)
    suspend()
  }
}
