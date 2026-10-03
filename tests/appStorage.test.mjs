import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

// Exercise the real hook's queue/status lifecycle without opening user storage.
const source = await readFile(new URL('../src/hooks/useAppStorage.ts', import.meta.url), 'utf8')
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
const seed = () => ({ tasks: [{ id: 'fixture', title: 'Original', completed: false }] })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function harness(overrides = {}) {
  const previousWindow = globalThis.window
  globalThis.window = { localStorage: { getItem: () => null } }
  let durable = seed(), api, view
  const writes = []
  const repository = {
    loadOrMigrate: async () => durable,
    getLastLocalSaveAt: async () => '2026-10-03T12:00:00Z',
    getBackupVerification: async () => null,
    saveChanged: async (before, after) => { writes.push([before, after]); durable = after },
    ...overrides,
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return React
    if (name === '../backup') return { STORAGE_KEY: 'disposable-test' }
    if (name === '../data/demoData') return { createDemoState: seed }
    if (name === '../storage/indexedDbRepository') return { appRepository: repository }
    throw Error(`Unexpected dependency: ${name}`)
  }, module, module.exports)
  function Probe() { api = module.exports.useAppStorage(); return null }
  await act(async () => { view = create(React.createElement(Probe)) })
  return {
    repository, writes,
    get api() { return api },
    get durable() { return durable },
    async edit(title) { await act(async () => api.setData(state => ({ ...state, tasks: [{ ...state.tasks[0], title }] }))) },
    async flush(action = () => {}) { await act(async () => { await action() }) },
    dispose() { act(() => view.unmount()); globalThis.window = previousWindow },
  }
}

test('storage stays saving until queued edits commit in order; an older commit cannot announce the latest edit saved', async () => {
  const first = deferred(), second = deferred(), writes = []
  const h = await harness({ saveChanged(before, after) {
    writes.push([before, after])
    return writes.length === 1 ? first.promise : second.promise
  } })
  try {
    assert.equal(h.api.ready, true)
    assert.equal(h.api.saveState.kind, 'saved')
    await h.edit('First edit'); await h.edit('Latest edit')
    assert.equal(h.api.saveState.kind, 'saving')
    assert.equal(writes.length, 1)
    await h.flush(() => first.resolve())
    assert.equal(writes.length, 2)
    assert.equal(writes[1][0].tasks[0].title, 'First edit')
    assert.equal(writes[1][1].tasks[0].title, 'Latest edit')
    assert.equal(h.api.saveState.kind, 'saving')
    await h.flush(() => second.resolve())
    assert.equal(h.api.saveState.kind, 'saved')
    assert.equal(h.api.data.tasks[0].title, 'Latest edit')
  } finally { h.dispose() }
})

test('a refused write keeps the draft visible and retries from the last committed snapshot', async () => {
  const writes = []
  let fail = true
  const h = await harness({ async saveChanged(before, after) {
    writes.push([before, after])
    if (fail) throw Error('Disposable quota failure')
  } })
  try {
    await h.edit('Unsaved draft')
    assert.equal(h.api.saveState.kind, 'error')
    assert.match(h.api.saveState.error, /quota failure/)
    assert.equal(h.api.data.tasks[0].title, 'Unsaved draft')
    assert.equal(writes[0][0].tasks[0].title, 'Original')
    fail = false
    await h.flush(() => h.api.retrySave())
    assert.equal(h.api.saveState.kind, 'saved')
    assert.equal(writes.length, 2)
    assert.equal(writes[1][0].tasks[0].title, 'Original')
    assert.equal(writes[1][1].tasks[0].title, 'Unsaved draft')
  } finally { h.dispose() }
})

test('failed storage boot does not save demo over unavailable records; retry loads the existing records', async () => {
  let fail = true
  const stored = { tasks: [{ id: 'existing', title: 'Existing private record', completed: true }] }
  const h = await harness({ async loadOrMigrate() {
    if (fail) throw Error('Disposable open failure')
    return stored
  } })
  try {
    assert.equal(h.api.ready, false)
    assert.equal(h.api.saveState.kind, 'error')
    assert.equal(h.writes.length, 0)
    fail = false
    await h.flush(() => h.api.retrySave())
    assert.equal(h.api.ready, true)
    assert.equal(h.api.saveState.kind, 'saved')
    assert.deepEqual(h.api.data, stored)
    assert.equal(h.writes.length, 0)
  } finally { h.dispose() }
})
