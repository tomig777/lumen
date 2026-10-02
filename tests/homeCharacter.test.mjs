import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'
import * as THREE from 'three'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../src/components/HomeCharacter.tsx', import.meta.url), 'utf8')
const sceneSource = await readFile(new URL('../src/components/HomeCharacterScene.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/home.css', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const compile = source => transformSync(source, { loader: 'tsx', jsx: 'transform', format: 'cjs' }).code
const geometryModule = { exports: {} }
new Function('require', 'module', 'exports', compile(await readFile(new URL('../src/components/characterGeometry.ts', import.meta.url), 'utf8')))(require, geometryModule, geometryModule.exports)

class Target extends EventTarget {
  listeners = new Set()
  addEventListener(type, listener) { this.listeners.add(listener); super.addEventListener(type, listener) }
  removeEventListener(type, listener) { this.listeners.delete(listener); super.removeEventListener(type, listener) }
}

function harness({ hidden = false, active = true, mirror = false, theme = 'dark', crash = false } = {}) {
  const oldDocument = globalThis.document, oldObserver = globalThis.IntersectionObserver
  const document = new Target(); document.hidden = hidden
  globalThis.document = document
  let observer, loads = 0, cleanups = 0, disconnected = false
  globalThis.IntersectionObserver = class {
    constructor(callback) { observer = callback }
    observe() {}
    disconnect() { disconnected = true }
  }
  let resolve, reject
  const pending = new Promise((yes, no) => { resolve = yes; reject = no })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'loadScene', compile(source).replace('import("./HomeCharacterScene")', 'loadScene()'))(
    require, module, module.exports, () => { loads++; return pending },
  )
  const callbacks = []
  function Scene(props) {
    if (crash) throw new Error('WebGL unavailable')
    React.useEffect(() => { callbacks.push(props); return () => { cleanups++ } }, [])
    return React.createElement('canvas', { 'data-active': props.active, 'data-theme': props.theme })
  }
  let view
  const render = () => React.createElement(module.exports.HomeCharacter, { active, mirror, theme })
  act(() => { view = create(render(), { createNodeMock: () => ({}) }) })
  return {
    view, callbacks, document,
    get loads() { return loads }, get cleanups() { return cleanups },
    get ready() { return view.root.findByProps({ className: 'liquid-glass-window home-placeholder-orb home-character' }).props['data-ready'] },
    visible(value) { act(() => observer([{ isIntersecting: value }])) },
    hidden(value) { act(() => { document.hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) },
    active(value) { act(() => { active = value; view.update(render()) }) },
    theme(value) { act(() => { theme = value; view.update(render()) }) },
    async load() { await act(async () => { resolve({ HomeCharacterScene: Scene }); await pending }) },
    async reject() { await act(async () => { reject(new Error('Offline chunk unavailable')); await Promise.resolve() }) },
    dispose() {
      act(() => view.unmount()); assert.equal(document.listeners.size, 0)
      if (!mirror) assert.equal(disconnected, true)
      globalThis.document = oldDocument; globalThis.IntersectionObserver = oldObserver
    },
  }
}

test('only visible Home lazily loads one scene; fallback waits for a successful draw', async () => {
  const h = harness()
  try {
    assert.equal(h.loads, 0); assert.equal(h.ready, false)
    assert.equal(h.view.root.findAllByType('i').length, 2)
    h.visible(true); assert.equal(h.loads, 1)
    await h.load(); assert.equal(h.view.root.findAllByType('canvas').length, 1); assert.equal(h.ready, false)
    act(() => h.callbacks[0].onReady()); assert.equal(h.ready, true)
    h.theme('light'); assert.equal(h.view.root.findByType('canvas').props['data-theme'], 'light'); assert.equal(h.loads, 1)
  } finally { h.dispose() }
  assert.equal(h.cleanups, 1)
})

test('mirror never observes, fetches or mounts WebGL; initially covered Home defers loading', () => {
  const mirror = harness({ mirror: true })
  try { assert.equal(mirror.loads, 0); assert.equal(mirror.document.listeners.size, 0); assert.equal(mirror.ready, false) }
  finally { mirror.dispose() }
  const covered = harness({ active: false })
  try { covered.visible(true); assert.equal(covered.loads, 0); covered.active(true); assert.equal(covered.loads, 1) }
  finally { covered.dispose() }
})

test('off-screen, background and editor overlays pause the same canvas, then resume without reloading', async () => {
  const h = harness()
  try {
    h.visible(true); await h.load()
    for (const change of [value => h.visible(value), value => h.hidden(!value), value => h.active(value)]) {
      change(false); assert.equal(h.view.root.findByType('canvas').props['data-active'], false)
      change(true); assert.equal(h.view.root.findByType('canvas').props['data-active'], true)
    }
    assert.equal(h.loads, 1); assert.equal(h.cleanups, 0)
  } finally { h.dispose() }
})

test('load failure keeps static eyes and does not endlessly retry', async () => {
  const h = harness()
  try {
    h.visible(true); await h.reject()
    assert.equal(h.ready, false); assert.equal(h.view.root.findAllByType('canvas').length, 0)
    assert.equal(h.view.root.findAllByType('i').length, 2)
    h.hidden(true); h.hidden(false); h.active(false); h.active(true)
    assert.equal(h.loads, 1)
  } finally { h.dispose() }
})

test('context failure disposes the canvas; stale readiness cannot remove the fallback', async () => {
  const h = harness()
  try {
    h.visible(true); await h.load()
    const oldReady = h.callbacks[0].onReady
    act(() => oldReady()); assert.equal(h.ready, true)
    act(() => h.callbacks[0].onFailure())
    assert.equal(h.cleanups, 1); assert.equal(h.ready, false)
    act(() => oldReady()); assert.equal(h.ready, false)
    assert.equal(h.view.root.findAllByType('canvas').length, 0)
  } finally { h.dispose() }
})

test('an in-flight import cannot mount after leaving Home', async () => {
  const h = harness(); h.visible(true); h.dispose(); await h.load()
  assert.equal(h.cleanups, 0); assert.equal(h.callbacks.length, 0)
})

test('background startup and cancellation while covered cannot start a stray canvas', async () => {
  const h = harness({ hidden: true })
  try {
    h.visible(true); assert.equal(h.loads, 0)
    h.hidden(false); assert.equal(h.loads, 1)
    h.active(false); await h.load()
    assert.equal(h.view.root.findAllByType('canvas').length, 0)
    await act(async () => { h.active(true); await Promise.resolve() })
    assert.equal(h.view.root.findAllByType('canvas').length, 1)
  } finally { h.dispose() }
})

test('a renderer initialization exception is contained inside the decoration', async () => {
  const h = harness({ crash: true })
  const originalError = console.error
  try {
    console.error = () => {}
    h.visible(true); await h.load()
    assert.equal(h.ready, false); assert.equal(h.view.root.findAllByType('canvas').length, 0)
    assert.equal(h.view.root.findAllByType('i').length, 2)
  } finally { console.error = originalError; h.dispose() }
})

test('eye positions and pill orientations follow the actual spherical surface', () => {
  for (const x of [-.23, .23]) {
    const pose = geometryModule.exports.eyePose(x, .18)
    const position = new THREE.Vector3(...pose.position)
    assert.ok(Math.abs(position.length() - 1.024) < 1e-9)
    const normal = position.clone().normalize()
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(...pose.quaternion))
    assert.ok(localZ.distanceTo(normal) < 1e-9)
    assert.ok(position.z > .97); assert.equal(Math.sign(position.x), Math.sign(x))
  }
  const sphere = new THREE.SphereGeometry(1, 48, 32)
  assert.ok(sphere.index.count / 3 < 3200); sphere.dispose()
})

test('actual scene is bounded and demand-rendered, with first-frame/context guards and no animation pass', async () => {
  const oldDocument = globalThis.document
  globalThis.document = { hidden: false }
  const canvas = new Target()
  let frame, priority, draws = 0, invalidates = 0, readies = 0, failures = 0, failDraw = false
  const gl = { domElement: canvas, render() { if (failDraw) throw new Error('GPU failed'); draws++ } }
  const module = { exports: {} }
  const fiber = {
    Canvas: ({ children, ...props }) => React.createElement('canvas-host', props, children),
    useThree: () => ({ gl, invalidate: () => invalidates++ }),
    useFrame: (callback, value) => { frame = callback; priority = value },
  }
  new Function('require', 'module', 'exports', compile(sceneSource))(
    name => name === '@react-three/fiber' ? fiber : name === './characterGeometry' ? geometryModule.exports : require(name), module, module.exports,
  )
  let view
  const props = { theme: 'dark', active: true, onReady: () => readies++, onFailure: () => failures++ }
  try {
    act(() => { view = create(React.createElement(module.exports.HomeCharacterScene, props)) })
    const host = view.root.findByType('canvas-host')
    assert.deepEqual(host.props.dpr, [1, 1.5]); assert.equal(host.props.frameloop, 'demand')
    assert.equal(host.props.camera.zoom, 108); assert.equal(priority, 1); assert.equal(invalidates, 1)
    assert.equal(draws, 0); assert.equal(readies, 0)
    act(() => frame({ gl, scene: {}, camera: {} })); await Promise.resolve()
    assert.equal(draws, 1); assert.equal(readies, 1)
    frame({ gl, scene: {}, camera: {} }); await Promise.resolve(); assert.equal(readies, 1)
    act(() => view.update(React.createElement(module.exports.HomeCharacterScene, { ...props, active: false })))
    assert.equal(view.root.findByType('canvas-host').props.frameloop, 'never')
    frame({ gl }); assert.equal(draws, 2)
    act(() => view.update(React.createElement(module.exports.HomeCharacterScene, props)))
    globalThis.document.hidden = true; frame({ gl }); assert.equal(draws, 2)
    globalThis.document.hidden = false; failDraw = true; frame({ gl, scene: {}, camera: {} }); assert.equal(failures, 1)
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); assert.equal(failures, 2)
  } finally { act(() => view?.unmount()); assert.equal(canvas.listeners.size, 0); globalThis.document = oldDocument }
  assert.doesNotMatch(sceneSource.replace(/\/\/[^\n]*/g, ''), /setInterval|requestAnimationFrame|Math\.random|transmission|useFBO|postprocessing|TextureLoader|dispose=\{null\}/)
})

test('Home wiring excludes mirrors/overlays and the scene chunk is part of the offline shell', async () => {
  assert.match(app, /renderScreen\(mirror\)/)
  assert.match(app, /characterActive=\{screen === 'home' && !sheet.kind && !selectedImage\} mirror=\{mirror\}/)
  assert.match(css, /home-character\[data-ready="true"\] .home-character-fallback \{ visibility: hidden/)
  assert.match(css, /pointer-events: none/)
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  assert.match(worker, /assets\/HomeCharacterScene-[^" ]+\.js/)
  assert.doesNotMatch(source, /localStorage|indexedDB|onClick|setInterval/)
})
