import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { Script, runInNewContext } from 'node:vm'
import { DIAGNOSTIC_FILE, renderLayoutDiagnostic } from '../scripts/layout-diagnostic.mjs'

const template = await readFile(new URL('./fixtures/screen-layout-test.html', import.meta.url), 'utf8')
const built = await readFile(new URL(`../dist/${DIAGNOSTIC_FILE}`, import.meta.url), 'utf8')
const release = JSON.parse(await readFile(new URL('../dist/release.json', import.meta.url), 'utf8'))
const index = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const scripts = [...template.matchAll(/<script id="([^"]+)">([\s\S]*?)<\/script>/g)]
const style = (html, id) => html.match(new RegExp(`<style id="${id}">([\\s\\S]*?)<\\/style>`))[1]

test('generated diagnostic shares release identity and keeps independent inline scripts/styles byte-identical', () => {
  assert.equal(built, renderLayoutDiagnostic(template, release))
  for (const [name, value] of Object.entries(release)) {
    assert.ok(built.includes(`name="lumen-diagnostic-${name}" content="${value}"`))
    assert.ok(index.includes(`name="lumen-${name}" content="${value}"`))
  }
  assert.equal(scripts.length, 2)
  for (const [, id, code] of scripts) {
    new Script(code)
    assert.ok(built.includes(`<script id="${id}">${code}</script>`))
  }
  for (const id of ['baseline-layout', 'experiment-layout', 'test-presentation']) assert.equal(style(built, id), style(template, id))
  assert.doesNotMatch(built, /local-unpublished|not published to your phone yet/)
})

test('diagnostic never loads app assets, storage, requests, worker registration or remote resources', () => {
  assert.doesNotMatch(built, /<script[^>]+src=|<link\b|@import|\bimport\s|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|indexedDB|localStorage|sessionStorage|serviceWorker|document\.cookie|https?:\/\//i)
  assert.match(built, /No Lumen records are loaded or saved/)
  assert.match(built, /Browser results do not prove installed-iPhone painting/)
  assert.match(built, /apple-mobile-web-app-status-bar-style" content="black-translucent/)
  assert.match(built, /viewport-fit=cover/)
})

test('return route stays at the app root for root and GitHub Pages hosting', () => {
  const href = built.match(/class="return-link" href="([^"]+)"/)[1]
  for (const scope of ['https://example.test/', 'https://example.test/lumen/']) {
    assert.equal(new URL(href, `${scope}${DIAGNOSTIC_FILE}?case=c&theme=dark`).href, scope)
  }
})

test('renderer rejects untrusted release values and missing/duplicated template markers', () => {
  assert.ok(renderLayoutDiagnostic(template, { version: '0.1.3', build: '82185d6' }).includes('name="lumen-diagnostic-build" content="82185d6"'))
  assert.throws(() => renderLayoutDiagnostic(template, null), /Invalid/)
  for (const value of ['0.1.3" onload="oops', '<script>', '', undefined]) assert.throws(() => renderLayoutDiagnostic(template, { version: value, build: 'local' }), /Invalid/)
  for (const value of ['local-unpublished', 'full-git-hash', '"<script>', undefined]) assert.throws(() => renderLayoutDiagnostic(template, { version: '0.1.3', build: value }), /Invalid/)
  assert.throws(() => renderLayoutDiagnostic(template.replace('class="return-link"', 'class="missing"'), release), /marker/)
  assert.throws(() => renderLayoutDiagnostic(template + 'class="return-link" href="../../"', release), /marker/)
})

test('frozen pre-fix baseline retains shell/navigation offsets; B/C change only their named variables', async () => {
  const mobile = await readFile(new URL('../src/mobile.css', import.meta.url), 'utf8')
  const base = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  const polish = await readFile(new URL('../src/polish.css', import.meta.url), 'utf8')
  const baseline = style(template, 'baseline-layout').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const declaration of ['position: fixed', 'inset: 0', 'width: 100%', 'height: 100vh', 'height: 100dvh', 'bottom: auto', 'height: 100lvh', 'min-width: 0', 'overflow: hidden', 'padding-top: max(56px, calc(env(safe-area-inset-top) + 12px))', 'right: calc(64px + env(safe-area-inset-right))', 'left: max(12px, env(safe-area-inset-left))', 'padding: 5px 7px', 'min-height: 44px', 'top: 3px']) {
    assert.ok(baseline.includes(declaration), `diagnostic: ${declaration}`)
    assert.ok(mobile.includes(declaration), `production: ${declaration}`)
  }
  assert.ok(base.includes('html, body, #root { min-height: 100%; margin: 0; }'))
  for (const declaration of ['width: 50px', 'height: 50px', 'right: -57px']) assert.ok(polish.includes(declaration) && baseline.includes(declaration))
  assert.ok(mobile.includes('--lumen-nav-height: 56px') && baseline.includes('--nav-height: 56px'))
  const candidate = style(template, 'experiment-layout').replace(/\/\*[\s\S]*?\*\//g, '')
  const declarations = [...candidate.matchAll(/\b([a-z-]+)\s*:\s*([^;{}]+);/g)].map((match) => `${match[1]}:${match[2]}`)
  assert.deepEqual(declarations, ['min-height:100vh', 'min-height:100dvh', 'min-height:100vh', 'min-height:100lvh', 'position:relative', 'inset:auto'])
  assert.match(candidate, /html\[data-layout-case="c"\] \.deployed-app-root \{ position: relative; inset: auto; \}/)
  assert.doesNotMatch(candidate, /padding|overflow|transform|screen\.height|47px|844px/)
})

test('startup uses only closed case/theme sets, including malformed or injected query values', () => {
  for (const [query, expectedCase, expectedTheme] of [
    ['', 'a', 'light'], ['?case=b&theme=dark', 'b', 'dark'], ['?case=c&theme=light', 'c', 'light'],
    ['?case=%22%3E%3Cscript%3E&theme=%22%3E', 'a', 'light'], ['?case=C&theme=DARK', 'a', 'light'],
  ]) {
    const dataset = {}
    runInNewContext(scripts[0][2], { URL, location: { href: `https://example.test/lumen/${DIAGNOSTIC_FILE}${query}` }, document: { documentElement: { dataset } } })
    assert.deepEqual(dataset, { layoutCase: expectedCase, testTheme: expectedTheme })
  }
})

// Execute the shipped controls with a minimal isolated DOM. No real app/data
// is involved; clipboard rejection and probe cleanup can be tested reliably.
function controls({ clipboard, failStyles = false } = {}) {
  const elements = new Map(), probes = new Set()
  const element = (id) => ({
    id, value: '', textContent: '', hidden: true, disabled: true, dataset: {}, style: {}, children: [], listeners: new Map(),
    addEventListener(name, listener) { this.listeners.set(name, listener) },
    setAttribute() {}, appendChild(child) { this.children.push(child) },
    remove() { probes.delete(this) }, focus() { document.activeElement = this }, blur() { document.activeElement = null }, select() { this.selected = true },
    getBoundingClientRect() { return { left: 0, right: 390, top: 0, bottom: 797, width: 390, height: 797 } },
  })
  const root = element('html')
  root.dataset = { layoutCase: 'b', testTheme: 'dark' }
  root.clientWidth = 390; root.clientHeight = 797; root.scrollHeight = 797
  const document = {
    documentElement: root, body: element('body'), activeElement: null,
    getElementById(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id) },
    querySelector(selector) {
      if (selector.startsWith('meta')) return { content: template.match(new RegExp(`${selector.match(/name="([^"]+)"/)[1]}" content="([^"]+)"`))[1] }
      return this.getElementById(selector)
    },
    querySelectorAll() { return [] },
    createElement(tag) { return element(tag) },
  }
  document.body.appendChild = (probe) => probes.add(probe)
  const computed = { height: '797px', minHeight: '0px', display: 'block', position: 'fixed', overflowX: 'hidden', overflowY: 'hidden', transform: 'none', filter: 'none', contain: 'none', paddingTop: '47px', paddingRight: '0px', paddingBottom: '34px', paddingLeft: '0px' }
  runInNewContext(scripts[1][2], {
    document, navigator: { clipboard, userAgent: 'iPhone OS 17_3', standalone: true }, matchMedia: () => ({ matches: false }),
    CSS: { supports: () => true }, getComputedStyle: () => { if (failStyles) throw new Error('simulated unavailable styles'); return computed },
    window: { visualViewport: { width: 390, height: 797, offsetTop: 0, scale: 1 } },
    screen: { width: 390, height: 844 }, innerWidth: 390, innerHeight: 797, scrollX: 0, scrollY: 0,
  })
  return { document, probes, click: (id) => document.getElementById(id).listeners.get('click')() }
}

test('user-requested report excludes typed content, cleans probes, and has a manual clipboard-denial fallback', async () => {
  for (const clipboard of [undefined, { async writeText() { throw new Error('denied') } }]) {
    const app = controls({ clipboard })
    const field = app.document.getElementById('keyboard-field')
    field.value = 'NEVER_INCLUDE_MY_TEST_WORD'; field.focus()
    assert.equal(app.document.getElementById('report').value, '')
    app.click('measure')
    const report = app.document.getElementById('report')
    assert.match(report.value, /Keyboard test focused: Yes/)
    assert.match(report.value, /Document viewport \(client\): 390 × 797/)
    assert.doesNotMatch(report.value, /NEVER_INCLUDE/)
    assert.equal(app.probes.size, 0)
    assert.equal(app.document.getElementById('copy').disabled, false)
    await app.click('copy')
    assert.match(app.document.getElementById('feedback').textContent, /Copy unavailable/)
    app.click('select-report')
    assert.equal(report.selected, true)
    assert.equal(app.document.activeElement, report)
    field.focus(); app.click('dismiss-keyboard')
    assert.equal(app.document.activeElement, null)
    assert.equal(field.value, 'NEVER_INCLUDE_MY_TEST_WORD')
  }
})

test('successful clipboard action copies only the requested report', async () => {
  let copied
  const app = controls({ clipboard: { async writeText(value) { copied = value } } })
  app.click('measure'); await app.click('copy')
  assert.equal(copied, app.document.getElementById('report').value)
  assert.match(app.document.getElementById('feedback').textContent, /Report copied/)
})

test('failed measurements remove every probe and disable stale report actions', () => {
  const app = controls({ failStyles: true })
  app.click('measure')
  assert.equal(app.probes.size, 0)
  assert.equal(app.document.getElementById('report').value, '')
  assert.equal(app.document.getElementById('report-panel').hidden, true)
  assert.equal(app.document.getElementById('copy').disabled, true)
  assert.match(app.document.getElementById('feedback').textContent, /Could not read layout/)
})

test('comparison entry is opt-in and blocked while app writes are unfinished', async () => {
  const component = await readFile(new URL('../src/components/ScreenLayoutCheck.tsx', import.meta.url), 'utf8')
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(app, /<ScreenLayoutCheck canLeave=\{saveState.kind === 'saved'\} \/>/)
  assert.match(component, /\{canLeave\s*\? <a[^>]+href="\.\/screen-layout-test.html\?case=a&theme=light"/)
  assert.match(component, /: <button[^>]+disabled>Open layout comparison/)
  assert.doesNotMatch(component, /location\.(?:assign|replace)|useEffect|window\.open/)
})
