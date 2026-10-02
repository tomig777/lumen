import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const mobile = await readFile(new URL('../src/mobile.css', import.meta.url), 'utf8')
const polish = await readFile(new URL('../src/polish.css', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const source = await readFile(new URL('../src/hooks/useLaunchTheme.ts', import.meta.url), 'utf8')
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
const module = { exports: {} }
new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports)
const { useLaunchTheme } = module.exports

test('the production document declares a dark first paint before the app module loads', () => {
  assert.match(html, /<html[^>]*data-lumen-launch="dark"/)
  const theme = html.match(/<style id="lumen-launch-theme">([\s\S]*?)<\/style>/)[1]
  assert.match(theme, /html\[data-lumen-launch="dark"\] \{ background: #24211e; color-scheme: dark; \}/)
  assert.match(theme, /html\[data-lumen-launch="dark"\] body/)
  assert.match(theme, /html\[data-lumen-launch="dark"\] #root \{ background: #24211e; \}/)
  assert.ok(html.indexOf('id="lumen-launch-theme"') < html.indexOf('<script type="module"'))
  assert.match(html, /name="color-scheme" content="dark light"/)
  assert.match(html, /name="theme-color" content="#24211e"/)
  assert.equal((html.match(/name="apple-mobile-web-app-status-bar-style"/g) ?? []).length, 1)
  assert.match(html, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/)
  assert.doesNotMatch(theme, /height|width|position|overflow|padding|margin|!important/)
})

test('loading and its error/retry content use the same readable dark welcome palette', () => {
  assert.match(mobile, /html:has\(\.deployed-app-root \.storage-loading-screen\) \{[^}]*--lumen-surface-color: var\(--lumen-welcome\);[^}]*color-scheme: dark;/)
  const loading = polish.match(/\.storage-loading-screen \{([^}]+)\}/)[1]
  assert.match(loading, /color: #e8d9c7;/)
  assert.match(loading, /background: var\(--lumen-welcome\);/)
  assert.match(polish, /\.storage-loading-screen p \{[^}]*color: #c6ab8d;/)
  assert.match(polish, /\.storage-loading-screen button \{[^}]*background: #e8d9c7; color: #24211e;/)
})

test('launch colours are released only when a real screen is ready, including a delayed data load', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const attributes = new Map([['data-lumen-launch', 'dark']])
  const removed = []
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    documentElement: { removeAttribute(name) { removed.push(name); attributes.delete(name) } },
  } })
  function Screen({ ready }) {
    useLaunchTheme(ready)
    return React.createElement('main', { className: ready ? 'lumen-start' : 'storage-loading-screen' })
  }
  let renderer
  try {
    act(() => { renderer = create(React.createElement(Screen, { ready: false })) })
    assert.equal(attributes.get('data-lumen-launch'), 'dark')
    assert.deepEqual(removed, [])
    act(() => renderer.update(React.createElement(Screen, { ready: false })))
    assert.equal(attributes.get('data-lumen-launch'), 'dark', 'slow/error loading never exposes a light boot surface')
    act(() => renderer.update(React.createElement(Screen, { ready: true })))
    assert.equal(renderer.root.findByType('main').props.className, 'lumen-start')
    assert.equal(attributes.has('data-lumen-launch'), false)
    assert.deepEqual(removed, ['data-lumen-launch'])
    act(() => renderer.update(React.createElement(Screen, { ready: true })))
    assert.deepEqual(removed, ['data-lumen-launch'], 'later screens do not continually rewrite launch colours')
  } finally {
    if (renderer) act(() => renderer.unmount())
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else delete globalThis.document
  }
})

test('the app uses readiness to release boot styling and leaves light/dark pages and native controls alone', () => {
  assert.match(app, /useLaunchTheme\(ready\)/)
  assert.match(source, /useLayoutEffect/)
  assert.doesNotMatch(source, /localStorage|indexedDB|setTimeout|setInterval|addEventListener|matchMedia|setAttribute|theme-color|status-bar-style/)
  assert.match(mobile, /html:has\(\.deployed-app-root\) \{[^}]*color-scheme: light;/)
  assert.match(mobile, /html:has\(\.deployed-app-root \.lumen-start\) \{[^}]*color-scheme: dark;/)
  assert.match(mobile, /html:has\(\.deployed-app-root :is\(\.brain-screen, \.health-screen, \.focus-player-screen\)\) \{[^}]*color-scheme: dark;/)
})
