import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const source = await readFile(new URL('../src/theme.ts', import.meta.url), 'utf8')
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/theme.css', import.meta.url), 'utf8')
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const repositorySource = await readFile(new URL('../src/storage/indexedDbRepository.ts', import.meta.url), 'utf8')
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
const bootstrap = html.match(/<script id="lumen-theme-bootstrap">([\s\S]*?)<\/script>/)[1]
const key = 'lumen-appearance-v1'

function harness({ stored = null, denied = false, initial = 'dark', launch = false } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document }
  const values = new Map([['personal-os-demo-v1', 'untouched personal data'], [key, stored]])
  const writes = []
  const attributes = new Map([['data-lumen-theme', initial]])
  if (launch) attributes.set('data-lumen-launch', initial)
  let metaColor
  const root = {
    style: {}, getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    hasAttribute: name => attributes.has(name),
  }
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    querySelector(selector) {
      assert.equal(selector, 'meta[name="theme-color"]')
      return { setAttribute(name, value) { assert.equal(name, 'content'); metaColor = value } }
    },
  })
  const window = new EventTarget()
  let observers = 0
  const add = window.addEventListener.bind(window), remove = window.removeEventListener.bind(window)
  window.addEventListener = (name, fn) => { observers++; add(name, fn) }
  window.removeEventListener = (name, fn) => { observers--; remove(name, fn) }
  const storage = {
    getItem(name) { if (denied) throw Error('Storage denied'); return values.get(name) ?? null },
    setItem(name, value) { if (denied) throw Error('Storage denied'); writes.push([name, value]); values.set(name, value) },
  }
  Object.defineProperty(window, 'localStorage', { get() { if (denied) throw Error('Storage denied'); return storage } })
  globalThis.window = window; globalThis.document = document
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports)
  return {
    ...module.exports, window, document, storage, values, writes, attributes, root,
    get observers() { return observers }, get metaColor() { return metaColor },
    boot() { runInNewContext(bootstrap, { document, get localStorage() { return window.localStorage } }) },
    storageEvent(name, value, area = storage) {
      const event = new Event('storage')
      Object.assign(event, { key: name, newValue: value, storageArea: area })
      window.dispatchEvent(event)
    },
    dispose() { globalThis.window = previous.window; globalThis.document = previous.document },
  }
}

test('first-paint bootstrap uses the same key/closed values and runs before modules and styles', () => {
  assert.ok(bootstrap.includes(key)); assert.match(source, /THEME_KEY = 'lumen-appearance-v1'/)
  assert.ok(html.indexOf('id="lumen-theme-bootstrap"') < html.indexOf('<style'))
  assert.ok(html.indexOf('id="lumen-theme-bootstrap"') < html.indexOf('type="module"'))
  for (const stored of [null, '', 'dark', 'light', 'LIGHT', '{"theme":"light"}', '<script>']) {
    const h = harness({ stored })
    try {
      h.boot()
      const expected = stored === 'light' ? 'light' : 'dark'
      assert.equal(h.attributes.get('data-lumen-theme'), expected)
      assert.equal(h.attributes.get('data-lumen-launch'), expected)
      assert.equal(h.root.style.colorScheme, expected)
      assert.equal(h.readTheme(), expected)
      assert.deepEqual(h.writes, [])
    } finally { h.dispose() }
  }
})

test('denied storage cannot prevent first paint or an in-session appearance change', () => {
  const h = harness({ denied: true, launch: true })
  try {
    assert.doesNotThrow(() => h.boot()); assert.equal(h.readTheme(), 'dark')
    assert.equal(h.setAppTheme('light'), false)
    assert.equal(h.attributes.get('data-lumen-theme'), 'light')
    assert.equal(h.attributes.get('data-lumen-launch'), 'light')
    assert.equal(h.metaColor, '#f7f3ed')
    assert.equal(h.values.get('personal-os-demo-v1'), 'untouched personal data')
  } finally { h.dispose() }
})

test('theme saves only a device UI preference; invalid input cannot affect it or records', () => {
  const h = harness()
  try {
    assert.equal(h.setAppTheme('light'), true); assert.equal(h.readTheme(), 'light')
    assert.equal(h.setAppTheme('dark'), true); assert.equal(h.readTheme(), 'dark')
    assert.equal(h.setAppTheme('system'), false)
    assert.deepEqual(h.writes, [[key, 'light'], [key, 'dark']])
    assert.equal(h.values.get('personal-os-demo-v1'), 'untouched personal data')
    assert.doesNotMatch(source, /indexedDB|replaceData|clear\(|removeItem|status-bar-style|matchMedia/)
  } finally { h.dispose() }
})

test('all subscribed viewports share updates; storage events ignore other data and cleanup on unmount', () => {
  const h = harness({ initial: 'light' })
  let view
  function Sample() { return React.createElement('span', null, h.useAppTheme()) }
  try {
    act(() => { view = create(React.createElement(React.Fragment, null, React.createElement(Sample), React.createElement(Sample))) })
    assert.equal(h.observers, 1)
    assert.deepEqual(view.root.findAllByType('span').map(e => e.children[0]), ['light', 'light'])
    act(() => h.setAppTheme('dark'))
    assert.deepEqual(view.root.findAllByType('span').map(e => e.children[0]), ['dark', 'dark'])
    act(() => h.storageEvent('personal-os-demo-v1', 'light'))
    assert.equal(h.attributes.get('data-lumen-theme'), 'dark')
    act(() => h.storageEvent(key, 'light', {}))
    assert.equal(h.attributes.get('data-lumen-theme'), 'dark')
    act(() => h.storageEvent(key, 'light'))
    assert.deepEqual(view.root.findAllByType('span').map(e => e.children[0]), ['light', 'light'])
    act(() => h.storageEvent(key, null))
    assert.equal(h.attributes.get('data-lumen-theme'), 'dark')
  } finally { if (view) act(() => view.unmount()); assert.equal(h.observers, 0); h.dispose() }
})

test('saved Light survives a new bootstrap/module load and backup restore does not own appearance', () => {
  const h = harness({ stored: 'light' })
  try { h.boot(); assert.equal(h.readTheme(), 'light') } finally { h.dispose() }
  const fresh = harness({ stored: 'light', initial: 'light' })
  let view
  function Sample() { return React.createElement('span', null, fresh.useAppTheme()) }
  try {
    act(() => { view = create(React.createElement(Sample)) })
    assert.equal(view.root.findByType('span').children[0], 'light')
    assert.doesNotMatch(repositorySource, /lumen-appearance-v1|THEME_KEY/)
  } finally { if (view) act(() => view.unmount()); fresh.dispose() }
})

test('both palettes meet opaque text/control and semantic foreground/background contrast', () => {
  function luminance(hex) {
    return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
      .map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4)
      .reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0)
  }
  function ratio(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
  for (const block of css.matchAll(/html\[data-lumen-theme(?:='light')?\] \{([^}]+)\}/g)) {
    const values = Object.fromEntries([...block[1].matchAll(/--lumen-([\w-]+): (#[a-f0-9]{6});/g)].map(m => [m[1],m[2]]))
    if (!values.bg) continue
    for (const fg of ['text','text-secondary','text-muted','accent']) for (const bg of ['bg','surface','surface-raised']) assert.ok(ratio(values[fg],values[bg]) >= 4.5, `${fg}/${bg}`)
    for (const bg of ['bg','surface','surface-raised']) assert.ok(ratio(values['control-edge'], values[bg]) >= 3)
    for (const semantic of ['danger','success','warning']) assert.ok(ratio(values[semantic], values[semantic+'-bg']) >= 4.5, semantic)
    assert.ok(ratio(values['on-selection'], values.selection) >= 4.5)
  }
})

test('global appearance covers route surfaces, overlays, native fields and graph without geometry/filter hacks', async () => {
  assert.match(main, /import '\.\/welcome.css'[\s\S]*import '\.\/theme.css'/)
  for (const name of ['screen-scroll','people-screen','focus-player','workout-screen','onboarding-page','image-viewer','bottom-sheet','brain-category-editor','health-month-panel','exercise-preview-panel','backup-panel','storage-loading-screen']) assert.ok(css.includes('.'+name), name)
  assert.doesNotMatch(css, /(?:100dvh|100lvh|safe-area-inset|filter:\s*invert|height:\s*\d|position:\s*fixed)/)
  assert.match(css, /\.bottom-nav \.nav-item.is-active \{ background: transparent/)
  assert.match(css, /\.home-task-card::after \{ background: none/)
  for (const label of ['inspiration-intro > span', 'journal-modes > span:not(.is-active)', 'journal-entry-meta i', 'detail-progress > span']) assert.ok(css.includes('.'+label), label)
  const graph = await readFile(new URL('../src/components/VisualComponents.tsx', import.meta.url), 'utf8')
  assert.match(graph, /getComputedStyle\(canvas\)/)
  assert.match(graph, /addEventListener\(THEME_EVENT, scheduleDraw\)/)
  assert.match(graph, /removeEventListener\(THEME_EVENT, scheduleDraw\)/)
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  assert.doesNotMatch(worker.match(/^const FILES = (\[.*\])$/m)[1], /theme-controls/)
})
