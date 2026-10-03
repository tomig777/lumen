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
const animationSource = await readFile(new URL('../src/components/characterAnimation.ts', import.meta.url), 'utf8')
const animationModule = { exports: {} }
new Function('require', 'module', 'exports', compile(animationSource))(require, animationModule, animationModule.exports)
const pointerModule = { exports: {} }
new Function('module', 'exports', compile(await readFile(new URL('../src/components/characterPointer.ts', import.meta.url), 'utf8')))(pointerModule, pointerModule.exports)

class Target extends EventTarget {
  listeners = new Set()
  addEventListener(type, listener) { this.listeners.add(listener); super.addEventListener(type, listener) }
  removeEventListener(type, listener) { this.listeners.delete(listener); super.removeEventListener(type, listener) }
}

function harness({ hidden = false, active = true, mirror = false, theme = 'dark', crash = false, reduced = false, pointerRoot = null } = {}) {
  const oldDocument = globalThis.document, oldObserver = globalThis.IntersectionObserver
  const oldWindow = globalThis.window
  const preference = new Target(); preference.matches = reduced
  const window = new Target(); window.matchMedia = () => preference
  globalThis.window = window
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
    name => name === './characterPointer' ? pointerModule.exports : require(name), module, module.exports, () => { loads++; return pending },
  )
  const callbacks = []
  function Scene(props) {
    if (crash) throw new Error('WebGL unavailable')
    React.useEffect(() => { callbacks.push(props); return () => { cleanups++ } }, [])
    return React.createElement('canvas', { 'data-active': props.active, 'data-theme': props.theme, 'data-reduced': props.reducedMotion })
  }
  let view
  const render = () => React.createElement(module.exports.HomeCharacter, { active, mirror, theme })
  act(() => { view = create(render(), { createNodeMock: () => ({ closest: () => pointerRoot }) }) })
  return {
    view, callbacks, document,
    get loads() { return loads }, get cleanups() { return cleanups },
    get ready() { return view.root.findByProps({ className: 'liquid-glass-window home-placeholder-orb home-character' }).props['data-ready'] },
    visible(value) { act(() => observer([{ isIntersecting: value }])) },
    hidden(value) { act(() => { document.hidden = value; document.dispatchEvent(new Event('visibilitychange')) }) },
    active(value) { act(() => { active = value; view.update(render()) }) },
    theme(value) { act(() => { theme = value; view.update(render()) }) },
    motion(value) { act(() => { preference.matches = value; preference.dispatchEvent(new Event('change')) }) },
    async load() { await act(async () => { resolve({ HomeCharacterScene: Scene }); await pending }) },
    async reject() { await act(async () => { reject(new Error('Offline chunk unavailable')); await Promise.resolve() }) },
    dispose() {
      act(() => view.unmount()); assert.equal(document.listeners.size, 0)
      if (!mirror) assert.equal(disconnected, true)
      globalThis.document = oldDocument; globalThis.IntersectionObserver = oldObserver
      assert.equal(preference.listeners.size, 0); assert.equal(window.listeners.size, 0); globalThis.window = oldWindow
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

test('Reduce Motion starts and changes to a still scene without losing the approved character or reloading', async () => {
  const h = harness({ reduced: true })
  try {
    h.visible(true); await h.load()
    assert.equal(h.view.root.findByType('canvas').props['data-reduced'], true)
    h.motion(false); assert.equal(h.view.root.findByType('canvas').props['data-reduced'], false)
    h.motion(true); assert.equal(h.view.root.findByType('canvas').props['data-reduced'], true)
    assert.equal(h.loads, 1); assert.equal(h.cleanups, 0)
  } finally { h.dispose() }
})

test('actual wrapper binds gaze only after readiness and detaches on overlay, hide, offscreen, reduced motion and failure', async () => {
  const root=new Target(),h=harness({pointerRoot:root})
  try {
    assert.equal(root.listeners.size,0);h.visible(true);await h.load()
    assert.equal(root.listeners.size,0)
    act(()=>h.callbacks[0].onReady());assert.equal(root.listeners.size,3)
    const input=h.callbacks[0].gazeInput
    h.theme('light');assert.equal(root.listeners.size,3)
    for(const change of [value=>h.active(value),value=>h.hidden(!value),value=>h.visible(value),value=>h.motion(!value)]) {
      change(false);assert.equal(root.listeners.size,0)
      change(true);assert.equal(root.listeners.size,3)
    }
    assert.equal(h.callbacks[0].gazeInput,input)
    act(()=>h.callbacks[0].onFailure());assert.equal(root.listeners.size,0)
  } finally {h.dispose();assert.equal(root.listeners.size,0)}
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
    assert.ok(Math.abs(position.length() - 1.04) < 1e-9)
    const normal = position.clone().normalize()
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(...pose.quaternion))
    assert.ok(localZ.distanceTo(normal) < 1e-9)
    assert.ok(position.z > .97); assert.equal(Math.sign(position.x), Math.sign(x))
  }
  const sphere = new THREE.SphereGeometry(1, 48, 32)
  assert.ok(sphere.index.count / 3 < 3200); sphere.dispose()
})

test('actual still scene is bounded and demand-rendered, with first-frame/context guards and no extra pass', async () => {
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
    name => name === '@react-three/fiber' ? fiber : name === './characterGeometry' ? geometryModule.exports : name === './characterAnimation' ? animationModule.exports : require(name), module, module.exports,
  )
  let view
  const props = { theme: 'dark', active: true, reducedMotion: true, onReady: () => readies++, onFailure: () => failures++ }
  try {
    act(() => { view = create(React.createElement(module.exports.HomeCharacterScene, props)) })
    const host = view.root.findByType('canvas-host')
    assert.deepEqual(host.props.dpr, [1, 1.5]); assert.equal(host.props.frameloop, 'demand')
    assert.equal(host.props.camera.zoom, 108); assert.equal(priority, 1); assert.equal(invalidates, 1)
    const material = view.root.findByType('meshPhysicalMaterial')
    assert.equal(material.props.color, '#e8d9c7'); assert.ok(material.props.metalness <= .05)
    assert.deepEqual(view.root.findByType('hemisphereLight').props.args, ['#fff0da', '#b59f87', 1.5])
    for (const eye of view.root.findAllByType('capsuleGeometry')) {
      assert.deepEqual(eye.props.args, [.076, .204, 6, 12])
      const [radius, length] = eye.props.args
      assert.ok(radius / .05875 > 1.25 && radius / .05875 < 1.35, 'eyes are noticeably wider')
      assert.ok((length + 2 * radius) / .3175 > 1.1 && (length + 2 * radius) / .3175 < 1.15, 'height increases modestly')
    }
    for (const eye of view.root.findAllByType('meshBasicMaterial')) assert.equal(eye.props.color, '#302b26')
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
  assert.doesNotMatch(sceneSource.replace(/\/\/[^\n]*/g, ''), /setInterval|requestAnimationFrame|transmission|useFBO|postprocessing|TextureLoader|dispose=\{null\}/)
})

function idleHarness(random = .75) {
  let now = 0, next = 0, draws = 0
  const timers = new Map(), poses = []
  const clock = {
    now: () => now, random: () => random,
    setTimer(callback, delay) { const id = ++next; timers.set(id, { callback, at: now + delay }); return id },
    clearTimer: id => timers.delete(id), requestDraw: () => draws++, apply: pose => poses.push(pose),
  }
  const controller = animationModule.exports.createIdleEyes(clock)
  return { controller, clock, timers, poses, get draws() { return draws },
    get pose() { return poses.at(-1) },
    advance(ms) { now += ms },
    fire() { const [id,timer] = [...timers].sort((a,b)=>a[1].at-b[1].at)[0]; timers.delete(id); now = Math.max(now,timer.at); timer.callback() },
  }
}

test('blink closes and reopens in 200ms, then settled frames request no more drawing', () => {
  const h = idleHarness()
  h.controller.start(); assert.equal(h.timers.size,2)
  h.fire(); h.advance(80); h.controller.frame(); assert.ok(Math.abs(h.pose.openness-.08)<1e-9)
  h.advance(60); h.controller.frame(); assert.ok(h.pose.openness>.08 && h.pose.openness<1)
  h.advance(60); h.controller.frame(); assert.equal(h.pose.openness,1)
  const draws = h.draws
  h.advance(50); h.controller.frame(); assert.equal(h.draws,draws); assert.equal(h.timers.size,2)
  h.controller.stop(); assert.equal(h.timers.size,0)
})

test('bounded random gaze eases out, holds without frames, and smoothly returns to neutral', () => {
  for (const random of [0,.25,.75,1]) {
    const h = idleHarness(random)
    h.controller.start(); h.fire(); h.advance(200); h.controller.frame() // first blink
    h.fire(); h.advance(190); h.controller.frame()
    assert.ok(Math.abs(h.pose.x)<=.1 && Math.abs(h.pose.y)<=.06)
    assert.ok(Math.abs(h.pose.x - (random*2-1)*.05)<1e-9)
    h.advance(190); h.controller.frame()
    assert.ok(Math.abs(h.pose.x - (random*2-1)*.1)<1e-9)
    const draws = h.draws; h.controller.frame(); assert.equal(h.draws,draws)
    h.fire(); h.advance(210); h.controller.frame()
    assert.ok(Math.abs(h.pose.x - (random*2-1)*.05)<1e-9)
    h.advance(210); h.controller.frame(); assert.deepEqual(h.pose,{x:0,y:0,openness:1})
    const settled = h.draws; h.controller.frame(); assert.equal(h.draws,settled)
    assert.equal(h.timers.size,2); h.controller.stop()
  }
})

test('stop cancels timers and transitions; stale callbacks cannot restart even after resume', () => {
  const h = idleHarness()
  h.controller.start(); const stale = [...h.timers.values()].map(t=>t.callback)
  h.fire(); h.advance(80); h.controller.frame(); assert.ok(h.pose.openness<1)
  h.controller.stop(); assert.equal(h.timers.size,0); assert.deepEqual(h.pose,{x:0,y:0,openness:1})
  const draws = h.draws; h.advance(10000); h.controller.frame(); stale.forEach(fn=>fn()); assert.equal(h.draws,draws)
  h.controller.start(); const fresh = h.draws; stale.forEach(fn=>fn()); assert.equal(h.draws,fresh)
  assert.equal(h.timers.size,2); h.controller.start(); assert.equal(h.timers.size,2)
  h.controller.stop(); assert.equal(h.timers.size,0)
  assert.doesNotMatch(animationSource, /setInterval|requestAnimationFrame|useState|Date\.now/)
})

test('all gaze extremes stay attached to the sphere and keep the eye pair separation', () => {
  for (const x of [-.22,0,.22]) for (const y of [-.14,0,.14]) {
    const poses = [-.23,.23].map(base=>geometryModule.exports.eyePose(base+x,.18+y))
    poses.forEach(pose=>{
      const normal = new THREE.Vector3(...pose.position).normalize()
      assert.ok(Math.abs(new THREE.Vector3(...pose.position).length()-1.04)<1e-9)
      const axis = new THREE.Vector3(0,0,1).applyQuaternion(new THREE.Quaternion(...pose.quaternion))
      assert.ok(axis.distanceTo(normal)<1e-9)
    })
    assert.ok(poses[1].position[0]-poses[0].position[0]>.47)
  }
})

test('actual animated scene updates mesh refs, then cancels on pause, Reduce Motion, hide, context loss and unmount', () => {
  const oldDocument = globalThis.document, oldWindow = globalThis.window
  const oldPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance'), oldRandom = Math.random
  const document = new Target(); document.hidden = false
  const canvas = new Target(), clock = idleHarness(), meshes = []
  globalThis.document = document
  globalThis.window = { setTimeout: clock.clock.setTimer, clearTimeout: clock.clock.clearTimer }
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: clock.clock.now } })
  Math.random = () => .75
  let frame, draws = 0, requests = 0, failures = 0, failDraw = false, view
  const invalidate = () => requests++
  const gl = { domElement: canvas, render: () => { if(failDraw) throw new Error('GPU failed'); draws++ } }
  const fiber = { Canvas: ({children,...props})=>React.createElement('canvas-host',props,children),
    useThree: ()=>({gl,invalidate}), useFrame: callback=>{frame=callback} }
  const module = { exports: {} }
  new Function('require','module','exports',compile(sceneSource))(
    name=>name==='@react-three/fiber'?fiber:name==='./characterGeometry'?geometryModule.exports:name==='./characterAnimation'?animationModule.exports:require(name),module,module.exports)
  const gazeInput = pointerModule.exports.createGazeInput()
  const props = { active:true,reducedMotion:false,theme:'dark',gazeInput,onReady:()=>{},onFailure:()=>failures++ }
  const render = changes=>act(()=>view.update(React.createElement(module.exports.HomeCharacterScene,{...props,...changes})))
  const draw = ()=>frame({gl,scene:{},camera:{}})
  try {
    act(()=>{view=create(React.createElement(module.exports.HomeCharacterScene,props),{createNodeMock:element=>{
      if(element.type!=='mesh') return null
      const index=element.props.position[0]<0?0:1
      return meshes[index] ?? (meshes[index]=new THREE.Mesh())
    }})})
    assert.equal(meshes.length,2); assert.equal(clock.timers.size,2)
    draw(); clock.fire(); clock.advance(80); draw()
    meshes.forEach(mesh=>assert.ok(Math.abs(mesh.scale.y-.08)<1e-9))
    clock.advance(120); draw(); meshes.forEach(mesh=>assert.equal(mesh.scale.y,1))
    const settled=requests; draw(); assert.equal(requests,settled)
    clock.fire(); clock.advance(190); draw()
    assert.ok(Math.abs(meshes[0].position.x-(-.23+.025)*1.04)<1e-9)
    meshes.forEach(mesh=>assert.ok(Math.abs(mesh.position.length()-1.04)<1e-9))
    const scheduled=[...clock.timers.values()].map(timer=>timer.at)
    render({theme:'light'}); assert.deepEqual([...clock.timers.values()].map(timer=>timer.at),scheduled)
    draw(); assert.ok(Math.abs(meshes[0].position.x-(-.23+.025)*1.04)<1e-9)
    gazeInput.emit({x:.22,y:-.14}); clock.advance(160); draw()
    assert.equal(clock.timers.size,0)
    assert.ok(Math.abs(meshes[0].position.x-(-.23+.22)*1.04)<1e-9)
    meshes.forEach(mesh=>assert.ok(Math.abs(mesh.position.length()-1.04)<1e-9))
    const directRequests=requests; draw(); assert.equal(requests,directRequests)
    render({theme:'light'}); draw()
    assert.ok(Math.abs(meshes[0].position.x-(-.23+.22)*1.04)<1e-9)
    gazeInput.emit(null); clock.advance(420); draw(); assert.equal(clock.timers.size,2)
    const stale=[...clock.timers.values()].map(timer=>timer.callback)
    render({active:false}); assert.equal(clock.timers.size,0)
    const pausedDraws=draws; draw(); assert.equal(draws,pausedDraws)
    render({}); assert.equal(clock.timers.size,2)
    const resumed=requests; stale.forEach(callback=>callback()); assert.equal(requests,resumed)
    render({reducedMotion:true}); assert.equal(clock.timers.size,0)
    const reducedRequests=requests; gazeInput.emit({x:.22,y:.14}); assert.equal(requests,reducedRequests)
    meshes.forEach(mesh=>{assert.equal(mesh.scale.y,1);assert.ok(Math.abs(Math.abs(mesh.position.x)-.23*1.04)<1e-9)})
    render({}); assert.equal(clock.timers.size,2)
    document.hidden=true; document.dispatchEvent(new Event('visibilitychange')); assert.equal(clock.timers.size,0)
    const suspendedRequests=requests; gazeInput.emit({x:.22,y:.14}); assert.equal(requests,suspendedRequests)
    const hiddenDraws=draws; draw(); assert.equal(draws,hiddenDraws)
    render({active:false}); document.hidden=false; render({}); assert.equal(clock.timers.size,2)
    failDraw=true; draw(); assert.equal(failures,1);assert.equal(clock.timers.size,0)
    render({active:false}); failDraw=false;render({});assert.equal(clock.timers.size,2)
    canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})); assert.equal(failures,2);assert.equal(clock.timers.size,0)
  } finally {
    act(()=>view?.unmount()); assert.equal(clock.timers.size,0)
    assert.equal(document.listeners.size,0); assert.equal(canvas.listeners.size,0)
    globalThis.document=oldDocument;globalThis.window=oldWindow;Math.random=oldRandom
    Object.defineProperty(globalThis,'performance',oldPerformance)
  }
})

test('Home wiring excludes mirrors/overlays and the scene chunk is part of the offline shell', async () => {
  assert.match(app, /renderScreen\(mirror\)/)
  assert.match(app, /characterActive=\{screen === 'home' && !sheet.kind && !selectedImage && !taskDrawer\} mirror=\{mirror\}/)
  assert.match(css, /home-character\[data-ready="true"\] .home-character-fallback \{ visibility: hidden/)
  assert.match(css, /pointer-events: none/)
  assert.match(css, /#fff1dc, #e8d9c7 45%, #b59f87 82%/)
  assert.match(css, /home-character-fallback i \{[^}]*width: 7.4074%; height: 17.5926%;[^}]*background: #302b26/)
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  assert.match(worker, /assets\/HomeCharacterScene-[^" ]+\.js/)
  assert.doesNotMatch(source, /localStorage|indexedDB|onClick|setInterval/)
})
