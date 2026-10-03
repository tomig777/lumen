import React, { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { bindHomeGaze, createGazeInput, type GazeInput } from './characterPointer'

export interface HomeCharacterSceneProps {
  theme: 'dark' | 'light'
  active: boolean
  reducedMotion: boolean
  onReady: () => void
  onFailure: () => void
  gazeInput?: GazeInput
}

class CharacterBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

// A stale callback from a disposed canvas must never hide the fallback.
function CharacterSession({ Scene, onReady, onFailure, onReset, ...props }: HomeCharacterSceneProps & {
  Scene: ComponentType<HomeCharacterSceneProps>; onReset: () => void
}) {
  const mounted = useRef(false)
  useLayoutEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; onReset() }
  }, [onReset])
  const ready = useCallback(() => { if (mounted.current) onReady() }, [onReady])
  const fail = useCallback(() => { if (mounted.current) onFailure() }, [onFailure])
  return <Scene {...props} onReady={ready} onFailure={fail} />
}

/** Decoration only: tasks, storage and navigation never wait for this scene. */
export function HomeCharacter({ theme = 'dark', active = true, mirror = false }: {
  theme?: 'dark' | 'light'; active?: boolean; mirror?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const gazeInput = useRef(createGazeInput()).current
  const [Scene, setScene] = useState<ComponentType<HomeCharacterSceneProps> | null>(null)
  const [visible, setVisible] = useState(false)
  const [inView, setInView] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(true)
  const onReady = useCallback(() => setReady(true), [])
  const onReset = useCallback(() => setReady(false), [])
  const onFailure = useCallback(() => { setReady(false); setFailed(true) }, [])
  const eligible = active && visible && inView && !mirror && !failed

  useEffect(() => {
    if (mirror) return
    const sync = () => setVisible(!document.hidden)
    const preference = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    const syncMotion = () => setReducedMotion(preference?.matches ?? true)
    syncMotion()
    preference?.addEventListener('change', syncMotion)
    sync()
    document.addEventListener('visibilitychange', sync)
    const element = host.current
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      setInView(entries.some(entry => entry.isIntersecting))
    }, { threshold: 0 })
    if (element && observer) observer.observe(element)
    else setInView(true)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      preference?.removeEventListener('change', syncMotion)
      observer?.disconnect()
    }
  }, [mirror])

  useEffect(() => {
    if (!eligible || Scene) return
    let cancelled = false
    import('./HomeCharacterScene').then(module => {
      if (!cancelled) setScene(() => module.HomeCharacterScene)
    }).catch(() => { if (!cancelled) onFailure() })
    return () => { cancelled = true }
  }, [eligible, Scene, onFailure])

  useEffect(() => {
    if (!eligible || !ready || reducedMotion) return
    const element = host.current
    const root = element?.closest<HTMLElement>('.home-fixed')
    if (!element || !root) return
    return bindHomeGaze(root, element, gazeInput.emit)
  }, [eligible, ready, reducedMotion, gazeInput])

  return <div ref={host} className="liquid-glass-window home-placeholder-orb home-character" aria-hidden="true"
    data-ready={ready && !failed && !mirror} data-active={eligible} data-failed={failed}>
    <span className="home-character-fallback"><i /><i /></span>
    {Scene && !failed && !mirror && <CharacterBoundary onFailure={onFailure}>
      <CharacterSession Scene={Scene} theme={theme} active={eligible} reducedMotion={reducedMotion} gazeInput={gazeInput} onReady={onReady} onFailure={onFailure} onReset={onReset} />
    </CharacterBoundary>}
  </div>
}
