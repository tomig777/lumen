import React, { Component, useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'

export interface WelcomeGlassSceneProps {
  active: boolean
  onReady: () => void
  onFailure: () => void
}

class GlassBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

/** The real button and its CSS fallback never depend on loading WebGL. */
export function WelcomeGlass() {
  const host = useRef<HTMLSpanElement>(null)
  const [Scene, setScene] = useState<ComponentType<WelcomeGlassSceneProps> | null>(null)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setReady(false); setFailed(true) }, [])

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const welcome = host.current?.closest<HTMLElement>('.lumen-start')
    const sync = () => {
      setVisible(!document.hidden)
      setReduced(preference.matches)
      if (welcome) welcome.dataset.motionPaused = String(document.hidden || preference.matches)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    preference.addEventListener('change', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      preference.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    if (!visible || reduced || failed || Scene) return
    let cancelled = false
    // This creates a separate offline-cached chunk, not a renderer in the
    // main app bundle. Reduce Motion doesn't need to load it at all.
    import('./FluidGlassButton').then((module) => {
      if (!cancelled) setScene(() => module.FluidGlassButton)
    }).catch(() => { if (!cancelled) onFailure() })
    return () => { cancelled = true }
  }, [visible, reduced, failed, Scene, onFailure])

  return (
    <span ref={host} className="lumen-enter-glass" aria-hidden="true" data-ready={ready && !failed && !reduced}>
      {Scene && !failed && !reduced && (
        <GlassBoundary onFailure={onFailure}>
          <Scene active={visible} onReady={onReady} onFailure={onFailure} />
        </GlassBoundary>
      )}
    </span>
  )
}
