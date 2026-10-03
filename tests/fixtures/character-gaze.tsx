// Disposable local QA: real scene and controller, no app data or service worker.
// Buttons supply targets; they do not simulate native touch capture/gesture feel.
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HomeCharacterScene } from '../../src/components/HomeCharacterScene'
import { createGazeInput } from '../../src/components/characterPointer'

function Fixture() {
  const input = useRef(createGazeInput()).current
  const [active, setActive] = useState(true), [reducedMotion, setReduced] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark'), [status, setStatus] = useState('Loading renderer')
  const movingFrame = useRef<number | null>(null)
  const cancelMove = () => { if (movingFrame.current !== null) cancelAnimationFrame(movingFrame.current); movingFrame.current = null }
  useEffect(() => cancelMove, [])
  const target = (x: number, y: number) => { cancelMove();input.emit({x,y});setStatus(`Holding gaze ${x}, ${y}`) }
  const runMove = () => {
    cancelMove();setStatus('Moving gaze before each frame')
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 1200)
      input.emit({x: -.22 + .44 * progress, y: .14 - .28 * progress})
      if (progress < 1) movingFrame.current = requestAnimationFrame(step)
      else { movingFrame.current = null;setStatus('Moving gaze finished; holding lower right') }
    }
    movingFrame.current = requestAnimationFrame(step)
  }
  return <main style={{minHeight:'100vh',boxSizing:'border-box',padding:24,background:theme==='dark'?'#24211e':'#faf7f2',color:theme==='dark'?'#e8d9c7':'#302b26',font:'15px/1.5 system-ui'}}>
    <h1 style={{fontSize:22}}>Finger gaze · renderer QA</h1>
    <p>Real scene; button-supplied gaze. Native iPhone gestures remain a separate check.</p>
    <div style={{width:216,height:216,margin:'60px auto'}}>
      <HomeCharacterScene theme={theme} active={active} reducedMotion={reducedMotion} gazeInput={input}
        onReady={()=>setStatus('Renderer ready')} onFailure={()=>setStatus('Renderer failed')} />
    </div>
    <p role="status">{status}</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
      <button onClick={()=>target(-.22,.14)}>Look upper left</button>
      <button onClick={()=>target(.22,-.14)}>Look lower right</button>
      <button onClick={runMove}>Run moving gaze</button>
      <button onClick={()=>{cancelMove();input.emit(null);setStatus('Released; returning to idle')}}>Release gaze</button>
      <button onClick={()=>{cancelMove();setActive(!active)}}>{active?'Pause scene':'Resume scene'}</button>
      <button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>Switch theme</button>
      <button onClick={()=>{cancelMove();setReduced(!reducedMotion)}}>{reducedMotion?'Enable motion':'Reduce Motion'}</button>
    </div>
    <style>{'button{min-height:44px;padding:10px 14px;border:0;border-radius:22px;background:#e8d9c7;color:#302b26;font:inherit}'}</style>
  </main>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
