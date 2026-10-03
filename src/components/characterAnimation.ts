export type EyeState = { x: number; y: number; openness: number }
type Runtime = {
  now: () => number
  random: () => number
  setTimer: (callback: () => void, delay: number) => number
  clearTimer: (id: number) => void
  requestDraw: () => void
  apply: (state: EyeState) => void
}
type Gaze = { fromX: number; fromY: number; toX: number; toY: number; at: number; duration: number; returning: boolean; direct?: boolean }
const ease = (t: number) => { const p = Math.min(1, Math.max(0, t)); return p * p * (3 - 2 * p) }

/** Two quiet timer channels; only short transitions request another draw.
 * No RAF owner, React updates, wall-clock catch-up or work while stopped. */
export function createIdleEyes(runtime: Runtime) {
  let running = false, generation = 0
  let following = false, drawPending = false
  let x = 0, y = 0, openness = 1
  let touchTarget = { x: 0, y: 0 }, followFrameAt = 0
  let gaze: Gaze | null = null, blinkAt: number | null = null
  const timers = new Set<number>()
  const random = () => Math.min(1, Math.max(0, runtime.random()))
  const requestDraw = () => { if (!drawPending) { drawPending = true; runtime.requestDraw() } }
  const cancelTimers = () => { generation++; timers.forEach(runtime.clearTimer); timers.clear() }
  const later = (callback: () => void, delay: number) => {
    const ticket = generation
    const id = runtime.setTimer(() => {
      timers.delete(id)
      if (running && ticket === generation) callback()
    }, delay)
    timers.add(id)
  }
  const nextGaze = (first = false) => later(() => {
    gaze = { fromX: x, fromY: y, toX: (random() * 2 - 1) * .10,
      toY: (random() * 2 - 1) * .06, at: runtime.now(), duration: 380, returning: false }
    requestDraw()
  }, first ? 2500 + random() * 2200 : 4500 + random() * 3500)
  const nextBlink = (first = false) => later(() => {
    blinkAt = runtime.now()
    requestDraw()
  }, first ? 1900 + random() * 1700 : 3500 + random() * 3500)
  const stop = () => {
    running = false; following = false; drawPending = false; cancelTimers()
    gaze = null; blinkAt = null; x = 0; y = 0; openness = 1
    touchTarget = { x: 0, y: 0 }; followFrameAt = 0
    runtime.apply({ x, y, openness })
  }
  return {
    start() {
      if (running) return
      running = true; generation++
      runtime.apply({ x, y, openness }); requestDraw()
      nextGaze(true); nextBlink(true)
    },
    stop,
    follow(targetX: number, targetY: number) {
      if (!running || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return
      const toX = Math.max(-.22, Math.min(.22, targetX)), toY = Math.max(-.14, Math.min(.14, targetY))
      if (!following) {
        following = true; cancelTimers(); gaze = null; blinkAt = null; openness = 1
        followFrameAt = runtime.now()
      } else if (touchTarget.x === toX && touchTarget.y === toY) return
      // Input updates the destination only. Restarting a transition timestamp
      // here starves animation when moves arrive immediately before each draw.
      touchTarget = { x: toX, y: toY }
      requestDraw()
    },
    release() {
      if (!running || !following) return
      following = false; cancelTimers(); blinkAt = null; openness = 1
      gaze = { fromX: x, fromY: y, toX: 0, toY: 0, at: runtime.now(), duration: 420, returning: true, direct: true }
      requestDraw()
    },
    frame() {
      drawPending = false
      if (!running) return
      const now = runtime.now()
      let trackingUnsettled = false
      if (following) {
        // Frame-rate independent smoothing; bounded elapsed time prevents jumps.
        const elapsed = Math.min(64, Math.max(0, now - followFrameAt))
        followFrameAt = now
        const amount = 1 - Math.exp(-elapsed / 35)
        x += (touchTarget.x - x) * amount
        y += (touchTarget.y - y) * amount
        trackingUnsettled = Math.max(Math.abs(touchTarget.x - x), Math.abs(touchTarget.y - y)) > .0001
        if (!trackingUnsettled) { x = touchTarget.x; y = touchTarget.y }
      }
      if (gaze) {
        const current = gaze, progress = (now - current.at) / current.duration, amount = ease(progress)
        x = current.fromX + (current.toX - current.fromX) * amount
        y = current.fromY + (current.toY - current.fromY) * amount
        if (progress >= 1) {
          gaze = null
          if (current.direct) {
            if (!following) { nextGaze(true); nextBlink(true) }
          }
          else if (current.returning) nextGaze()
          else later(() => {
            gaze = { fromX: x, fromY: y, toX: 0, toY: 0, at: runtime.now(), duration: 420, returning: true }
            requestDraw()
          }, 900 + random() * 700)
        }
      }
      if (blinkAt !== null) {
        const elapsed = now - blinkAt
        openness = elapsed < 80 ? 1 - .92 * ease(elapsed / 80) : .08 + .92 * ease((elapsed - 80) / 120)
        if (elapsed >= 200) { openness = 1; blinkAt = null; nextBlink() }
      }
      runtime.apply({ x, y, openness })
      if (trackingUnsettled || gaze || blinkAt !== null) requestDraw()
    },
  }
}
