import assert from 'node:assert/strict'
import { test } from 'node:test'
import { editorViewportFrame } from '../src/mobileViewport.ts'

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
