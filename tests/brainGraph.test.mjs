import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBrainGraph, isSampleGraphNote } from '../src/brainGraph.ts'
import { createDemoState } from '../src/data/demoData.ts'

test('one graph dot represents every note, including the existing demo notes', () => {
  const notes = createDemoState().notes
  const before = JSON.stringify(notes)
  const graph = buildBrainGraph(notes)
  assert.equal(graph.nodes.length, notes.length)
  assert.equal(new Set(graph.nodes.map((node) => node.id)).size, notes.length)
  assert.equal(graph.links.length, 3475)
  assert.equal(JSON.stringify(notes), before)
  for (const node of graph.nodes) {
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y))
    assert.ok(node.x >= 3 && node.x <= 97 && node.y >= 3 && node.y <= 97)
  }
})

test('links are unique, bidirectional duplicates collapse, and hidden notes are excluded', () => {
  const notes = [
    { id: 'a', title: 'Alpha', body: '', tags: [], relatedNoteIds: ['b', 'b', 'a', 'missing'], pinned: false },
    { id: 'b', title: 'Beta', body: '', tags: [], relatedNoteIds: ['a', 'c'], pinned: false },
    { id: 'c', title: 'Gamma', body: '', tags: [], relatedNoteIds: [], pinned: false },
  ]
  const graph = buildBrainGraph(notes)
  assert.deepEqual(graph.links, [['a', 'b'], ['b', 'c']])
  const filtered = buildBrainGraph(notes, 'alpha')
  assert.deepEqual(filtered.nodes.map((node) => node.id), ['a'])
  assert.deepEqual(filtered.links, [])
})

test('legacy sample IDs remain identifiable without rewriting stored notes', () => {
  assert.equal(isSampleGraphNote({ id: 'graph-note-432' }), true)
  assert.equal(isSampleGraphNote({ id: 'graph-note-personal' }), false)
  assert.equal(isSampleGraphNote({ id: 'note-432' }), false)
})
