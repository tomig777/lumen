import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editorViewportFrame, observeEditorViewport } from '../src/mobileViewport.ts'

const portrait = { editing: true, layoutTop: 0, layoutHeight: 844, visualTop: 0, visualHeight: 844, scale: 1 }

test('a closed keyboard and small browser/safe-area differences do not resize editors', () => {
  assert.equal(editorViewportFrame(portrait), null)
  assert.equal(editorViewportFrame({ ...portrait, visualHeight: 797 }), null)
  assert.equal(editorViewportFrame({ ...portrait, visualTop: 47, visualHeight: 797 }), null)
  assert.equal(editorViewportFrame({ ...portrait, editing: false, visualHeight: 500 }), null)
})

test('keyboard frames follow the visible area and clamp panning to the app bounds', () => {
  assert.deepEqual(editorViewportFrame({ ...portrait, visualHeight: 500 }), { top: 0, height: 500 })
  assert.deepEqual(editorViewportFrame({ ...portrait, visualTop: 120, visualHeight: 500 }), { top: 120, height: 500 })
  assert.deepEqual(editorViewportFrame({ ...portrait, layoutTop: 20, visualTop: 120, visualHeight: 500 }), { top: 100, height: 500 })
  assert.deepEqual(editorViewportFrame({ ...portrait, visualTop: 600, visualHeight: 500 }), { top: 600, height: 244 })
})

test('pinch zoom and invalid viewport readings never trigger keyboard sizing', () => {
  for (const scale of [1.5, 2, .8]) {
    assert.equal(editorViewportFrame({ ...portrait, visualHeight: 500, scale }), null)
  }
  for (const visualHeight of [0, -1, NaN, Infinity]) {
    assert.equal(editorViewportFrame({ ...portrait, visualHeight }), null)
  }
  assert.equal(editorViewportFrame({ ...portrait, visualHeight: 500, visualTop: NaN }), null)
})

test('rotation and keyboard dismissal recalculate without retaining the last frame', () => {
  assert.deepEqual(editorViewportFrame({ ...portrait, visualHeight: 500 }), { top: 0, height: 500 })
  const landscape = { ...portrait, layoutHeight: 390, visualHeight: 228 }
  assert.deepEqual(editorViewportFrame(landscape), { top: 0, height: 228 })
  assert.equal(editorViewportFrame({ ...landscape, visualHeight: 390 }), null)
  assert.equal(editorViewportFrame(portrait), null) // Dismissal while the field remains focused.
  assert.equal(editorViewportFrame({ ...portrait, editing: false, visualTop: 120, visualHeight: 500 }), null)
})

function observedViewport() {
  const target = () => {
    const handlers = new Map()
    return {
      addEventListener(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn) },
      removeEventListener(name, fn) { handlers.get(name)?.delete(fn) },
      emit(name) { [...(handlers.get(name) ?? [])].forEach((fn) => fn()) },
      listeners() { return [...handlers.values()].reduce((n, entries) => n + entries.size, 0) },
    }
  }
  const attrs = new Map(), styles = new Map(), frames = new Map()
  const bounds = { top: 0, height: 844 }
  const field = { tagName: 'INPUT', type: 'text', readOnly: false, disabled: false, inApp: true }
  const app = { contains: (element) => !!element?.inApp, getBoundingClientRect: () => bounds }
  const doc = Object.assign(target(), {
    activeElement: field, visibilityState: 'visible', querySelector: () => app,
    documentElement: {
      setAttribute: (name, value) => attrs.set(name, value), removeAttribute: (name) => attrs.delete(name),
      style: { setProperty: (name, value) => styles.set(name, value), removeProperty: (name) => styles.delete(name) },
    },
  })
  const viewport = Object.assign(target(), { offsetTop: 0, height: 797, scale: 1 })
  let next = 0
  const win = Object.assign(target(), {
    document: doc, visualViewport: viewport,
    requestAnimationFrame(fn) { frames.set(++next, fn); return next },
    cancelAnimationFrame(id) { frames.delete(id) },
  })
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn()) }
  const clear = () => { assert.equal(attrs.size, 0); assert.equal(styles.size, 0) }
  return { win, doc, viewport, bounds, field, attrs, styles, frames, flush, clear }
}

test('the observer sizes only an active editor and coalesces viewport events', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.clear() // Exact reported 844/797 difference, with a focused field.
  v.viewport.height = 500
  v.viewport.offsetTop = 120
  v.viewport.emit('resize'); v.viewport.emit('scroll'); v.win.emit('resize')
  assert.equal(v.frames.size, 1)
  v.flush()
  assert.equal(v.attrs.get('data-lumen-keyboard'), 'open')
  assert.deepEqual([...v.styles], [['--lumen-editor-height', '500px'], ['--lumen-editor-top', '120px']])
  assert.deepEqual(v.bounds, { top: 0, height: 844 }, 'shell metrics remain unchanged')
  stop(); v.clear()
})

test('the observer recovers after dismissal while still focused, rotation and blur', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.viewport.height = 500; v.viewport.emit('resize'); v.flush()
  v.bounds.height = 390; v.viewport.height = 228; v.win.emit('orientationchange'); v.flush()
  assert.equal(v.styles.get('--lumen-editor-height'), '228px')
  v.viewport.height = 369; v.viewport.emit('resize'); v.flush(); v.clear()
  v.bounds.height = 844; v.viewport.height = 797; v.win.emit('orientationchange'); v.flush(); v.clear()
  v.viewport.height = 500; v.viewport.emit('resize'); v.flush()
  v.doc.activeElement = null; v.doc.emit('focusout'); v.flush(); v.clear()
  stop()
})

test('hide cancels a pending reading immediately and resume rereads current geometry', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.viewport.height = 500; v.viewport.emit('resize'); v.flush()
  v.viewport.offsetTop = 120; v.viewport.emit('scroll')
  v.doc.visibilityState = 'hidden'; v.doc.emit('visibilitychange')
  assert.equal(v.frames.size, 0); v.clear()
  v.viewport.height = 797; v.viewport.offsetTop = 0
  v.doc.visibilityState = 'visible'; v.doc.emit('visibilitychange'); v.win.emit('pageshow')
  assert.equal(v.frames.size, 1)
  v.flush(); v.clear()
  v.viewport.height = 500; v.viewport.emit('resize'); v.flush()
  v.win.emit('pagehide'); v.clear()
  v.win.emit('pageshow'); v.flush()
  assert.equal(v.styles.get('--lumen-editor-height'), '500px')
  stop()
})

test('zoom and invalid readings clear previous keyboard offsets rather than retain them', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.viewport.height = 500; v.viewport.emit('resize'); v.flush()
  v.viewport.scale = 1.5; v.viewport.emit('resize'); v.flush(); v.clear()
  v.viewport.scale = 1; v.viewport.emit('resize'); v.flush()
  assert.equal(v.styles.get('--lumen-editor-height'), '500px')
  v.viewport.height = NaN; v.viewport.emit('resize'); v.flush(); v.clear()
  stop()
})

test('non-text, disabled, read-only and outside-app controls never trigger resizing', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.viewport.height = 500
  for (const field of [
    { ...v.field, type: 'date' }, { ...v.field, type: 'file' }, { ...v.field, readOnly: true },
    { ...v.field, disabled: true }, { ...v.field, inApp: false }, { tagName: 'BUTTON', inApp: true },
    { tagName: 'TEXTAREA', inApp: true, readOnly: true },
  ]) {
    v.doc.activeElement = field; v.doc.emit('focusin'); v.flush(); v.clear()
  }
  for (const field of [{ tagName: 'TEXTAREA', inApp: true }, { tagName: 'DIV', inApp: true, isContentEditable: true }]) {
    v.doc.activeElement = field; v.doc.emit('focusin'); v.flush()
    assert.equal(v.attrs.get('data-lumen-keyboard'), 'open')
  }
  stop()
})

test('cleanup removes every observer and queued frame; missing VisualViewport is harmless', () => {
  const v = observedViewport(), stop = observeEditorViewport(v.win)
  v.viewport.height = 500; v.viewport.emit('resize')
  assert.equal(v.frames.size, 1)
  stop()
  assert.equal(v.frames.size, 0)
  assert.equal(v.win.listeners() + v.doc.listeners() + v.viewport.listeners(), 0)
  v.win.emit('resize'); v.viewport.emit('scroll'); v.doc.emit('focusin'); v.flush(); v.clear()
  v.win.visualViewport = null
  const stopWithoutViewport = observeEditorViewport(v.win)
  v.doc.emit('focusin'); v.flush(); v.clear()
  stopWithoutViewport()
})
