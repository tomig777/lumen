import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const source = await readFile(new URL('../src/components/WelcomeGlass.tsx', import.meta.url), 'utf8')
const { code } = transformSync(source, { loader: 'tsx', jsx: 'transform', format: 'cjs' })
assert.ok(code.includes('import("./FluidGlassButton")'), 'only replace the renderer-loading boundary, not the component logic')

class Target extends EventTarget {
  listeners = new Set()
  addEventListener(type, listener) { this.listeners.add(listener); super.addEventListener(type, listener) }
  removeEventListener(type, listener) { this.listeners.delete(listener); super.removeEventListener(type, listener) }
}

function harness({ reduced = false, hidden = false, loader } = {}) {
  const originalWindow = globalThis.window, originalDocument = globalThis.document
  const document = new Target()
  document.hidden = hidden
  const media = new Target()
  media.matches = reduced
  const welcome = { dataset: {} }
  globalThis.document = document
  globalThis.window = { matchMedia(query) { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media } }
  let resolve, reject, loads = 0, cleanups = 0, entries = 0
  const pending = new Promise((yes, no) => { resolve = yes; reject = no })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'loadScene', code.replace('import("./FluidGlassButton")', 'loadScene()'))(
    createRequire(import.meta.url), module, module.exports, () => { loads++; return loader ? loader() : pending },
  )
  const WelcomeGlass = module.exports.WelcomeGlass
  function Scene({ active, onReady }) {
    React.useEffect(() => { onReady(); return () => { cleanups++ } }, [onReady])
    return React.createElement('canvas', { 'data-active': active })
  }
  let renderer
  act(() => {
    renderer = create(React.createElement('button', { type: 'button', onClick: () => { entries++ } },
      React.createElement(WelcomeGlass), React.createElement('span', null, 'Enter Lumen')),
    { createNodeMock: () => ({ closest: () => welcome }) })
  })
  return {
    renderer, welcome, document, media, Scene, resolve, reject,
    get loads() { return loads }, get cleanups() { return cleanups }, get entries() { return entries },
    setHidden(value) { act(() => { document.hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) },
    setReduced(value) { act(() => { media.matches = value; media.dispatchEvent(new Event('change')) }) },
    click() { act(() => renderer.root.findByType('button').props.onClick()) },
    async load() { await act(async () => { resolve({ FluidGlassButton: Scene }); await pending }) },
    dispose() {
      act(() => renderer.unmount())
      assert.equal(document.listeners.size, 0)
      assert.equal(media.listeners.size, 0)
      globalThis.window = originalWindow
      globalThis.document = originalDocument
    },
  }
}

test('entry remains immediately usable while the separate renderer chunk loads', async () => {
  const h = harness()
  try {
    assert.equal(h.loads, 1)
    assert.equal(h.renderer.root.findByProps({ className: 'lumen-enter-glass' }).props['data-ready'], false)
    assert.equal(h.renderer.root.findAllByType('canvas').length, 0)
    h.click()
    assert.equal(h.entries, 1)
    await h.load()
    assert.equal(h.renderer.root.findByProps({ className: 'lumen-enter-glass' }).props['data-ready'], true)
    assert.equal(h.renderer.root.findByType('canvas').props['data-active'], true)
    assert.equal(h.renderer.root.findByType('button').props.disabled, undefined)
  } finally { h.dispose() }
  assert.equal(h.cleanups, 1, 'leaving welcome unmounts the renderer')
})

test('hiding the app pauses both float and rendering without starting another renderer', async () => {
  const h = harness()
  try {
    await h.load()
    h.setHidden(true)
    assert.equal(h.welcome.dataset.motionPaused, 'true')
    assert.equal(h.renderer.root.findByType('canvas').props['data-active'], false)
    h.setHidden(false)
    assert.equal(h.welcome.dataset.motionPaused, 'false')
    assert.equal(h.renderer.root.findByType('canvas').props['data-active'], true)
    assert.equal(h.loads, 1)
  } finally { h.dispose() }
})

test('Reduce Motion shows the borderless CSS fallback without fetching WebGL', async () => {
  const h = harness({ reduced: true })
  try {
    assert.equal(h.loads, 0)
    assert.equal(h.welcome.dataset.motionPaused, 'true')
    h.click()
    assert.equal(h.entries, 1)
    h.setReduced(false)
    await h.load()
    assert.equal(h.loads, 1)
    h.setReduced(true)
    assert.equal(h.renderer.root.findAllByType('canvas').length, 0)
    assert.equal(h.cleanups, 1)
    assert.equal(h.renderer.root.findByProps({ className: 'lumen-enter-glass' }).props['data-ready'], false)
    h.click()
    assert.equal(h.entries, 2)
  } finally { h.dispose() }
})

test('a rejected chunk download leaves a usable fallback instead of an error screen', async () => {
  const h = harness()
  try {
    await act(async () => { h.reject(new Error('Offline chunk unavailable')); await Promise.resolve() })
    assert.equal(h.renderer.root.findAllByType('canvas').length, 0)
    assert.equal(h.renderer.root.findByProps({ className: 'lumen-enter-glass' }).props['data-ready'], false)
    h.click()
    assert.equal(h.entries, 1)
    h.setHidden(true)
    h.setHidden(false)
    assert.equal(h.loads, 1, 'do not repeatedly retry a failed GPU/download initialization')
  } finally { h.dispose() }
})

test('a context failure removes the renderer and keeps the same working entry button', async () => {
  const h = harness()
  try {
    await h.load()
    act(() => h.renderer.root.findByType(h.Scene).props.onFailure())
    assert.equal(h.renderer.root.findAllByType('canvas').length, 0)
    assert.equal(h.cleanups, 1)
    h.click()
    assert.equal(h.entries, 1)
  } finally { h.dispose() }
})

test('an in-flight load cannot mount a renderer after welcome is left', async () => {
  const h = harness()
  h.dispose()
  await act(async () => { h.resolve({ FluidGlassButton: h.Scene }); await Promise.resolve() })
  assert.equal(h.cleanups, 0, 'the late renderer was never mounted')
})
