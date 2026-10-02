import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { AppOverlay } from '../../src/components/AppOverlay'
import { BottomNav } from '../../src/components/VisualComponents'
import { observeEditorViewport } from '../../src/mobileViewport'

const run = document.querySelector<HTMLButtonElement>('#run')!
const status = document.querySelector('#status')!
const results = document.querySelector('#results')!
const profiles = [
  { name: 'Installed portrait', width: 390, native: 797, full: 844, top: 47, bottom: 34, standalone: true, keyboard: 500 },
  { name: 'Browser portrait', width: 390, native: 797, full: 844, top: 47, bottom: 34, standalone: false, keyboard: 500 },
  { name: 'Installed landscape', width: 844, native: 369, full: 390, top: 0, bottom: 21, standalone: true, keyboard: 228 },
]
type Kind = 'category' | 'sheet' | 'quick' | 'page'

function Fixture({ kind }: { kind: Kind }) {
  const category = <div className="brain-category-layer" role="dialog" aria-label="Fixture category">
    <form className="brain-category-editor" onSubmit={(event) => event.preventDefault()}>
      <div className="brain-category-editor-head"><h2>Category</h2><button type="button" id="close">×</button></div>
      <label className="brain-category-field"><span>Name</span><input id="field" defaultValue="Fixture only" /></label>
      <div className="brain-category-option"><span>Notes</span><div className="brain-note-options">
        {Array.from({ length: 24 }, (_, index) => <button type="button" key={index}><span>Fixture note {index + 1}: a long title for wrapping and scroll checks</span></button>)}
      </div></div>
      <button type="submit" id="save" className="dark-button wide brain-category-save">Save category</button>
    </form>
  </div>
  return <div className="deployed-app-root"><div className="phone-app deployed-app-screen">
    <div className="screen-layer"><div className="screen-scroll brain-screen">
      <h1>Fixture page</h1>{kind === 'page' && <input id="field" aria-label="Fixture search" />}
      <div style={{ height: 1400 }} />
      {kind === 'category' && <AppOverlay>{category}</AppOverlay>}
    </div></div>
    <BottomNav active="brain" onChange={() => {}} quickActions={[]} motionId="editor-fixture" />
    {(kind === 'sheet' || kind === 'quick') && <div className={`sheet-layer${kind === 'quick' ? ' quick-capture-layer' : ''}`}>
      <div className={`bottom-sheet${kind === 'quick' ? ' quick-capture-sheet' : ''}`} role="dialog" aria-label="Fixture sheet">
        <div className="sheet-head"><h2>Fixture editor</h2><button id="close" className="icon-button" type="button">×</button></div>
        <form onSubmit={(event) => event.preventDefault()}>
          <textarea id="field" aria-label="Fixture text" rows={kind === 'quick' ? 4 : 2} />
          {kind === 'sheet' && Array.from({ length: 5 }, (_, index) => <textarea key={index} aria-label={`Fixture field ${index + 1}`} rows={2} />)}
          <button id="save" type="submit" className="dark-button wide">Save</button>
        </form>
      </div>
    </div>}
  </div></div>
}

run.addEventListener('click', async () => {
  run.disabled = true
  results.textContent = ''
  status.textContent = 'Running'
  let passed = 0, checks = 0
  const check = (ok: boolean, name: string, detail: string) => {
    checks++; if (ok) passed++
    results.textContent += `${ok ? 'PASS' : 'FAIL'} ${name}\n  ${detail}\n`
  }
  try {
    const styles = (await Promise.all(['styles', 'polish', 'mobile'].map(async (name) => {
      const response = await fetch(`/src/${name}.css?direct`)
      if (!response.ok) throw new Error(`${name}.css returned ${response.status}`)
      return response.text()
    }))).join('\n')
    for (const profile of profiles) {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = `position: fixed; left: -10000px; top: 0; border: 0; width: ${profile.width}px; height: ${profile.native}px`
      const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }))
      iframe.srcdoc = '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
      document.body.appendChild(iframe)
      await loaded
      const doc = iframe.contentDocument!, win = doc.defaultView!
      const style = doc.createElement('style')
      style.textContent = styles
        .replace(/\b100(dvh|lvh|vh)\b/g, (_, unit) => `${unit === 'dvh' ? profile.native : profile.full}px`)
        .replace(/\(display-mode: standalone\)/g, profile.standalone ? 'all' : 'not all')
        .replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,
          (_, side) => `${side === 'top' ? profile.top : side === 'bottom' ? profile.bottom : 0}px`)
      doc.head.appendChild(style)
      const mock = Object.assign(new EventTarget(), { height: profile.native, offsetTop: 0, scale: 1 })
      Object.defineProperty(win, 'visualViewport', { configurable: true, value: mock })
      const root = createRoot(doc.querySelector('#root')!)
      const settle = () => new Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve())))
      const emit = async (name = 'resize') => { mock.dispatchEvent(new Event(name)); await settle() }
      const rect = (selector: string) => doc.querySelector(selector)!.getBoundingClientRect()
      const height = profile.standalone ? profile.full : profile.native
      let stop = () => {}
      try {
        flushSync(() => root.render(<Fixture kind="category" />))
        await settle()
        stop = observeEditorViewport(win)
        const category = doc.querySelector<HTMLElement>('.brain-category-layer')!
        const field = doc.querySelector<HTMLInputElement>('#field')!
        field.focus({ preventScroll: true }); await settle()
        check(rect('.brain-category-layer').height === height && category.parentElement?.classList.contains('phone-app') === true
          && !category.closest('.screen-layer') && !doc.documentElement.hasAttribute('data-lumen-keyboard'),
        `${profile.name}: full-height overlay`, `Category ${rect('.brain-category-layer').height}; app ${height}; outside page scroller`)
        const navBefore = rect('.bottom-nav').bottom
        mock.height = profile.keyboard; mock.offsetTop = profile.width < 500 ? 120 : 0
        await emit()
        const keyboardBottom = mock.offsetTop + mock.height
        check(rect('.brain-category-layer').top === mock.offsetTop && rect('.brain-category-layer').height === mock.height
          && rect('.deployed-app-root').height === height && rect('.screen-layer').height === height
          && rect('.bottom-nav').bottom === navBefore,
        `${profile.name}: editor-only keyboard frame`, `Category ${rect('.brain-category-layer').top}–${rect('.brain-category-layer').bottom}; shell/nav unchanged`)
        check(parseFloat(win.getComputedStyle(category).paddingBottom) === 28,
          `${profile.name}: keyboard safe area once`, `Category bottom padding ${win.getComputedStyle(category).paddingBottom}; no home inset above keyboard`)
        const close = rect('#close')
        category.scrollTop = category.scrollHeight
        const save = rect('#save')
        check(close.top >= mock.offsetTop && close.bottom <= keyboardBottom && close.height >= 44
          && save.bottom <= keyboardBottom && save.top >= mock.offsetTop && save.height >= 44,
        `${profile.name}: category actions reachable`, `Close ${close.top}–${close.bottom}; scrolled Save ${save.top}–${save.bottom}`)
        category.scrollTop = 0
        mock.scale = 1.5; await emit()
        check(!doc.documentElement.hasAttribute('data-lumen-keyboard') && rect('.brain-category-layer').height === height,
          `${profile.name}: pinch zoom`, 'Keyboard override removed; shell still full height')
        mock.scale = 1; mock.height = profile.native; mock.offsetTop = 0; await emit()
        check(!doc.documentElement.hasAttribute('data-lumen-keyboard') && rect('.brain-category-layer').height === height
          && parseFloat(win.getComputedStyle(category).paddingBottom) === Math.max(28, profile.bottom + 12),
        `${profile.name}: focused dismissal`, `Full overlay restored; bottom padding ${win.getComputedStyle(category).paddingBottom}`)
        mock.height = profile.keyboard; await emit()
        win.dispatchEvent(new Event('pagehide'))
        check(!doc.documentElement.hasAttribute('data-lumen-keyboard'), `${profile.name}: suspend`, 'Cleared synchronously on pagehide')
        mock.height = profile.native; win.dispatchEvent(new Event('pageshow')); await settle()
        check(!doc.documentElement.hasAttribute('data-lumen-keyboard') && rect('.brain-category-layer').height === height,
          `${profile.name}: resume`, 'Current readings restored, not the old keyboard frame')

        for (const kind of ['sheet', 'quick', 'page'] as const) {
          flushSync(() => root.render(<Fixture kind={kind} />)); await settle()
          doc.querySelector<HTMLElement>('#field')!.focus({ preventScroll: true }); await settle()
          mock.height = profile.keyboard; mock.offsetTop = 0; await emit()
          const layer = kind === 'page' ? '.screen-layer' : '.sheet-layer'
          check(rect(layer).height === mock.height && rect('.deployed-app-root').height === height
            && rect('.bottom-nav').bottom === navBefore,
          `${profile.name}: ${kind} scoping`, `Editor ${rect(layer).height}; shell ${height}; nav ${navBefore}`)
          if (kind !== 'page') {
            const sheet = doc.querySelector<HTMLElement>('.bottom-sheet')!
            const close = rect('#close')
            sheet.scrollTop = sheet.scrollHeight
            const save = rect('#save')
            check(close.top >= 0 && close.bottom <= mock.height && save.top >= 0 && save.bottom <= mock.height
              && close.height >= 44 && save.height >= 44,
            `${profile.name}: ${kind} actions`, `Close ${close.top}–${close.bottom}; Save ${save.top}–${save.bottom}; scroll ${sheet.scrollTop}`)
          }
          mock.height = profile.native; await emit()
          check(!doc.documentElement.hasAttribute('data-lumen-keyboard') && rect(layer).height === height
            && !doc.documentElement.style.getPropertyValue('--lumen-editor-top') && win.scrollY === 0,
          `${profile.name}: ${kind} recovery`, `Editor ${rect(layer).height}; no retained offset or document scroll`)
        }
        results.textContent += '\n'
      } finally { stop(); flushSync(() => root.unmount()); iframe.remove() }
    }
    status.textContent = `${passed}/${checks} passed`
  } catch (error) { status.textContent = 'Test failed'; results.textContent += String(error) }
  finally { run.disabled = false }
})
run.disabled = false
