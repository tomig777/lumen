export type GazeTarget = { x: number; y: number } | null
export type CharacterReaction = 'happy' | 'all-done' | 'undo'
export type GazeInput = {
  subscribe: (listener: (target: GazeTarget) => void) => () => void
  subscribeReaction?: (listener: (reaction: CharacterReaction) => void) => () => void
  subscribeActivity?: (listener: () => void) => () => void
}

/** Presentation-only channel: no React updates or retained pointer after suspension. */
export function createGazeInput() {
  const listeners = new Set<(target: GazeTarget) => void>()
  const reactions = new Set<(reaction: CharacterReaction) => void>()
  const activities = new Set<() => void>()
  return {
    subscribe(listener: (target: GazeTarget) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    emit(target: GazeTarget) { listeners.forEach(listener => listener(target)) },
    subscribeReaction(listener: (reaction: CharacterReaction) => void) {
      reactions.add(listener); return () => { reactions.delete(listener) }
    },
    subscribeActivity(listener: () => void) {
      activities.add(listener); return () => { activities.delete(listener) }
    },
    react(reaction: CharacterReaction) { reactions.forEach(listener => listener(reaction)) },
    wake() { activities.forEach(listener => listener()) },
  }
}

export function pointerGaze(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const radius = Math.max(1, Math.min(rect.width, rect.height) / 2)
  return {
    x: Math.tanh((clientX - rect.left - rect.width / 2) / (radius * 2)) * .22,
    y: -Math.tanh((clientY - rect.top - rect.height / 2) / (radius * 2)) * .14,
  }
}

const excluded = 'button, a, input, textarea, select, [role="button"], [role="dialog"], [contenteditable], .home-task-section'

/** Capture only an eligible background gesture; never prevent a control's event. */
export function bindHomeGaze(root: HTMLElement, host: HTMLElement, emit: (target: GazeTarget) => void) {
  let pointer: number | null = null
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })
  const allowed = (event: PointerEvent) => {
    const { width, height } = viewport()
    return !document.hidden && event.clientX > 20 && event.clientX < width - 20 &&
      event.clientY > 55 && event.clientY < height - 44
  }
  const end = () => {
    const id = pointer
    pointer = null
    if (id === null) return
    emit(null)
    try { if (root.hasPointerCapture(id)) root.releasePointerCapture(id) } catch { /* Already cancelled by the browser. */ }
  }
  const update = (event: PointerEvent) => emit(pointerGaze(event.clientX, event.clientY, host.getBoundingClientRect()))
  const down = (event: PointerEvent) => {
    if (pointer !== null || !event.isPrimary || event.button !== 0 || !allowed(event)) return
    const target = event.target as Element | null
    if (!target?.closest('.home-liquid-focus') || target.closest(excluded)) return
    pointer = event.pointerId
    try { root.setPointerCapture(pointer) } catch { end(); return }
    update(event)
  }
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (!allowed(event) || !target || !root.contains(target) || target.closest(excluded)) { end(); return }
    update(event)
  }
  const up = (event: PointerEvent) => { if (event.pointerId === pointer) end() }
  const hidden = () => { if (document.hidden) end() }
  root.addEventListener('pointerdown', down)
  root.addEventListener('pointermove', move)
  root.addEventListener('pointerup', up)
  root.addEventListener('pointercancel', up)
  root.addEventListener('lostpointercapture', up)
  window.addEventListener('blur', end)
  window.addEventListener('resize', end)
  document.addEventListener('visibilitychange', hidden)
  return () => {
    end()
    root.removeEventListener('pointerdown', down)
    root.removeEventListener('pointermove', move)
    root.removeEventListener('pointerup', up)
    root.removeEventListener('pointercancel', up)
    root.removeEventListener('lostpointercapture', up)
    window.removeEventListener('blur', end)
    window.removeEventListener('resize', end)
    document.removeEventListener('visibilitychange', hidden)
  }
}
