import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { PeopleScreen } from '../../src/components/PeopleScreen'
import { BottomNav } from '../../src/components/VisualComponents'

const run = document.querySelector<HTMLButtonElement>('#run')!
const status = document.querySelector('#status')!
const results = document.querySelector('#results')!
const profiles = [
  { name: 'Installed portrait', width: 390, viewport: 797, full: 844, top: 47, bottom: 34, standalone: true },
  { name: 'Browser portrait', width: 390, viewport: 797, full: 844, top: 47, bottom: 34, standalone: false },
  { name: 'Installed landscape', width: 844, viewport: 369, full: 390, top: 0, bottom: 21, standalone: true },
  { name: 'Installed portrait restored', width: 390, viewport: 797, full: 844, top: 47, bottom: 34, standalone: true },
]

run.addEventListener('click', async () => {
  run.disabled = true
  results.textContent = ''
  status.textContent = 'Running'
  let passed = 0
  let checks = 0
  const check = (ok: boolean, name: string, detail: string) => {
    checks++
    if (ok) passed++
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
      iframe.style.cssText = `position: absolute; top: 0; left: 0; border: 0; width: ${profile.width}px; height: ${profile.viewport}px; visibility: hidden; pointer-events: none`
      const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }))
      iframe.srcdoc = '<!doctype html><html><head></head><body><div id="root"></div></body></html>'
      document.body.appendChild(iframe)
      await loaded
      const doc = iframe.contentDocument!
      const style = doc.createElement('style')
      style.textContent = styles
        .replace(/\b100(dvh|lvh|vh)\b/g, (_, unit) => `${unit === 'dvh' ? profile.viewport : profile.full}px`)
        .replace(/\(display-mode: standalone\)/g, profile.standalone ? 'all' : 'not all')
        .replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,
          (_, side) => `${side === 'top' ? profile.top : side === 'bottom' ? profile.bottom : 0}px`)
      doc.head.appendChild(style)
      const root = createRoot(doc.querySelector('#root')!)
      try {
        const height = profile.standalone ? profile.full : profile.viewport
        flushSync(() => root.render(
          <div className="deployed-app-root"><div className="phone-app deployed-app-screen">
            <div className="screen-layer"><PeopleScreen people={[]} onBack={() => {}} onOpenPerson={() => {}} /></div>
          </div></div>,
        ))
        const button = doc.querySelector<HTMLElement>('.people-bottom-switch')!
        const page = doc.querySelector<HTMLElement>('.people-screen')!
        const before = button.getBoundingClientRect()
        const expectedBottom = height - 14 - profile.bottom
        check(Math.abs(before.bottom - expectedBottom) < 1 && before.height >= 44 && !button.closest('.people-screen'),
          `${profile.name}: People anchor`, `Return bottom ${before.bottom}; expected ${expectedBottom}`)
        page.scrollTop = 340
        const after = button.getBoundingClientRect()
        check(Math.abs(after.top - before.top) < 1 && (profile.width < profile.viewport || page.scrollTop > 0),
          `${profile.name}: People scrolling`, `Scroll ${page.scrollTop}; return top ${before.top} → ${after.top}`)

        flushSync(() => root.render(
          <div className="deployed-app-root"><div className="phone-app deployed-app-screen">
            <div className="screen-layer"><div className="screen-scroll home-screen">
              <div style={{ height: 1200 }} /><button id="last-row" style={{ height: 44 }}>Last row</button>
            </div></div>
            <BottomNav active="home" onChange={() => {}} quickActions={[]} motionId="fixture" />
          </div></div>,
        ))
        const nav = doc.querySelector<HTMLElement>('.bottom-nav')!
        const capture = doc.querySelector<HTMLElement>('.nav-capture')!
        const navBox = nav.getBoundingClientRect()
        const captureBox = capture.getBoundingClientRect()
        const expectedNavBottom = height - Math.max(12, profile.bottom)
        check(Math.abs(navBox.bottom - expectedNavBottom) < 1 && captureBox.bottom <= navBox.bottom
          && captureBox.right <= profile.width && captureBox.top >= navBox.top,
          `${profile.name}: navigation/+`, `Nav bottom ${navBox.bottom}; expected ${expectedNavBottom}; + bottom ${captureBox.bottom}`)
        const scroll = doc.querySelector<HTMLElement>('.screen-scroll')!
        scroll.scrollTop = scroll.scrollHeight
        const last = doc.querySelector('#last-row')!.getBoundingClientRect()
        check(last.bottom <= navBox.top - 24 + 1 && doc.defaultView!.scrollY === 0
          && doc.documentElement.scrollWidth === doc.documentElement.clientWidth,
          `${profile.name}: content clearance`, `Last row ${last.bottom}; nav top ${navBox.top}; document scroll ${doc.defaultView!.scrollY}`)
        results.textContent += '\n'
      } finally {
        flushSync(() => root.unmount())
        iframe.remove()
      }
    }
    status.textContent = `${passed}/${checks} passed`
  } catch (error) {
    status.textContent = 'Test failed'
    results.textContent += String(error)
  } finally {
    run.disabled = false
  }
})

run.disabled = false
