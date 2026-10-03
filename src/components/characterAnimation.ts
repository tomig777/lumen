export type EyeState = { x: number; y: number; openness: number }
export type EyeSession = { lastGreetingAt: number; lastReactionAt: number }
type Expression = { kind: 'greeting' | 'happy' | 'all-done' | 'sleep' | 'wake'; at: number; from: number }
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

/** Quiet idle/activity timers; only short transitions request another draw.
 * No RAF owner, React updates, wall-clock catch-up or work while stopped. */
export function createIdleEyes(runtime: Runtime, options: { personality?: boolean; session?: EyeSession } = {}) {
  const personality = options.personality ?? false
  const session = options.session ?? { lastGreetingAt: -Infinity, lastReactionAt: -Infinity }
  let running = false, generation = 0
  let following = false, drawPending = false
  let sleepy = false, expression: Expression | null = null, sleepTimer: number | null = null
  let holdTimer: number | null = null
  let x = 0, y = 0, openness = 1
  let touchTarget = { x: 0, y: 0 }, followFrameAt = 0
  let gaze: Gaze | null = null, blinkAt: number | null = null
  const timers = new Set<number>()
  const random = () => Math.min(1, Math.max(0, runtime.random()))
  const requestDraw = () => { if (!drawPending) { drawPending = true; runtime.requestDraw() } }
  const cancelTimers = () => { generation++; timers.forEach(runtime.clearTimer); timers.clear(); sleepTimer = null; holdTimer = null }
  const later = (callback: () => void, delay: number) => {
    const ticket = generation
    const id = runtime.setTimer(() => {
      timers.delete(id)
      if (running && ticket === generation) callback()
    }, delay)
    timers.add(id)
    return id
  }
  const nextGaze = (first = false) => { if (sleepy) return; later(() => {
    gaze = { fromX: x, fromY: y, toX: (random() * 2 - 1) * .10,
      toY: (random() * 2 - 1) * .06, at: runtime.now(), duration: 380, returning: false }
    requestDraw()
  }, first ? 2500 + random() * 2200 : 4500 + random() * 3500) }
  const nextBlink = (first = false) => later(() => {
    blinkAt = runtime.now()
    requestDraw()
  }, sleepy ? 8000 + random() * 4000 : first ? 1900 + random() * 1700 : 3500 + random() * 3500)
  const neutralGaze = () => {
    gaze = { fromX: x, fromY: y, toX: 0, toY: 0, at: runtime.now(), duration: 420, returning: true, direct: true }
  }
  const armSleep = () => {
    if (!personality || !running || following || sleepy) return
    if (sleepTimer !== null) { runtime.clearTimer(sleepTimer); timers.delete(sleepTimer) }
    sleepTimer = later(() => {
      cancelTimers(); sleepy = true; blinkAt = null; neutralGaze()
      expression = { kind: 'sleep', at: runtime.now(), from: openness }
      nextBlink(); requestDraw()
    }, 40000)
  }
  const idle = () => { nextGaze(true); nextBlink(true); armSleep() }
  const activity = () => {
    if (!running || following || !personality) return
    if (sleepy) {
      cancelTimers(); sleepy = false; blinkAt = null; gaze = null
      expression = { kind: 'wake', at: runtime.now(), from: openness }
      requestDraw()
    }
    armSleep()
  }
  const stop = () => {
    running = false; following = false; drawPending = false; cancelTimers()
    gaze = null; blinkAt = null; x = 0; y = 0; openness = 1
    touchTarget = { x: 0, y: 0 }; followFrameAt = 0
    sleepy = false; expression = null
    runtime.apply({ x, y, openness })
  }
  return {
    start() {
      if (running) return
      running = true; generation++
      runtime.apply({ x, y, openness }); requestDraw()
      idle()
      if (personality && runtime.now() - session.lastGreetingAt >= 60000) {
        session.lastGreetingAt = runtime.now()
        expression = { kind: 'greeting', at: runtime.now(), from: 1 }
      }
    },
    stop,
    activity,
    react(kind: 'happy' | 'all-done' | 'undo') {
      if (!running || !personality || following) return
      activity()
      if (kind === 'undo') {
        if (expression?.kind === 'happy' || expression?.kind === 'all-done') {
          cancelTimers(); expression = { kind: 'wake', at: runtime.now(), from: openness }; requestDraw()
        }
        return
      }
      const upgrade = kind === 'all-done' && expression?.kind === 'happy'
      if (!upgrade && runtime.now() - session.lastReactionAt < 1500) return
      session.lastReactionAt = runtime.now()
      cancelTimers(); sleepy = false; blinkAt = null; neutralGaze()
      expression = { kind, at: runtime.now(), from: openness }
      requestDraw()
    },
    follow(targetX: number, targetY: number) {
      if (!running || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return
      const toX = Math.max(-.22, Math.min(.22, targetX)), toY = Math.max(-.14, Math.min(.14, targetY))
      if (!following) {
        following = true; cancelTimers(); gaze = null; blinkAt = null; sleepy = false
        expression = personality && openness !== 1 ? { kind: 'wake', at: runtime.now(), from: openness } : null
        if (!personality) openness = 1
        followFrameAt = runtime.now()
      } else if (touchTarget.x === toX && touchTarget.y === toY) return
      // Input updates the destination only. Restarting a transition timestamp
      // here starves animation when moves arrive immediately before each draw.
      touchTarget = { x: toX, y: toY }
      requestDraw()
    },
    release() {
      if (!running || !following) return
      following = false; cancelTimers(); blinkAt = null
      expression = personality && openness !== 1 ? { kind: 'wake', at: runtime.now(), from: openness } : null
      if (!personality) openness = 1
      neutralGaze()
      requestDraw()
    },
    frame() {
      drawPending = false
      if (!running) return
      const now = runtime.now()
      // A delayed first draw must not replay an expired greeting over a newer
      // idle blink (for example after a temporarily throttled renderer).
      if (expression?.kind === 'greeting' && now - expression.at >= 480) {
        expression = null; openness = 1
      }
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
            if (!following && !expression) idle()
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
        const resting = sleepy ? .48 : 1
        openness = elapsed < 80 ? resting - (resting - .08) * ease(elapsed / 80) : .08 + (resting - .08) * ease((elapsed - 80) / 120)
        if (elapsed >= 200) { openness = resting; blinkAt = null; nextBlink() }
      }
      if (expression) {
        const current = expression, elapsed = now - current.at
        if (current.kind === 'greeting') {
          const blinkTime = elapsed < 200 ? elapsed : elapsed >= 280 && elapsed < 480 ? elapsed - 280 : -1
          openness = blinkTime < 0 ? 1 : blinkTime < 80 ? 1 - .92 * ease(blinkTime / 80) : .08 + .92 * ease((blinkTime - 80) / 120)
          if (elapsed >= 480) { openness = 1; expression = null }
        } else if (current.kind === 'sleep' || current.kind === 'wake') {
          const duration = current.kind === 'sleep' ? 600 : 280, target = current.kind === 'sleep' ? .48 : 1
          openness = current.from + (target - current.from) * ease(elapsed / duration)
          if (elapsed >= duration) {
            expression = null
            if (current.kind === 'wake' && !following && !gaze) { cancelTimers(); idle() }
          }
        } else {
          const holdEnd = current.kind === 'all-done' ? 1300 : 700, target = current.kind === 'all-done' ? .28 : .36
          openness = elapsed < 160 ? current.from + (target - current.from) * ease(elapsed / 160)
            : elapsed < holdEnd ? target : target + (1 - target) * ease((elapsed - holdEnd) / 220)
          if (elapsed >= holdEnd + 220) { openness = 1; expression = null; idle() }
        }
      }
      runtime.apply({ x, y, openness })
      // A held happy pose waits on one timer instead of redrawing its whole hold.
      if (expression && (expression.kind === 'happy' || expression.kind === 'all-done')) {
        const elapsed = now - expression.at, holdEnd = expression.kind === 'all-done' ? 1300 : 700
        if (elapsed >= 160 && elapsed < holdEnd && holdTimer === null) holdTimer = later(() => { holdTimer = null; requestDraw() }, holdEnd - elapsed)
      }
      const holdingHappy = expression && (expression.kind === 'happy' || expression.kind === 'all-done') &&
        now - expression.at >= 160 && now - expression.at < (expression.kind === 'all-done' ? 1300 : 700)
      if (trackingUnsettled || gaze || blinkAt !== null || expression && !holdingHappy) requestDraw()
    },
  }
}
