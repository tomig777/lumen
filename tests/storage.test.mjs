import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { IDBObjectStore } from 'fake-indexeddb'
import 'fake-indexeddb/auto'
import { createDemoState } from '../src/data/demoData.ts'
import { createBackup, readBackup } from '../src/backup.ts'

// Bundle the browser-oriented TypeScript module for Node's built-in test runner.
const bundled = await build({ entryPoints: [fileURLToPath(new URL('../src/storage/indexedDbRepository.ts', import.meta.url))], bundle: true, format: 'esm', platform: 'node', write: false })
const { IndexedDbRepository } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`)
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'

function repository() { return new IndexedDbRepository(`lumen-test-${crypto.randomUUID()}`) }

test('migration copies every record and full photo bytes; a later launch reuses the verified copy', async () => {
  const source = createDemoState()
  source.notes.push({ id: 'private-note', title: 'My note', body: 'Keep this', tags: [], relatedNoteIds: [], pinned: false })
  source.imageAssets[0] = { ...source.imageAssets[0], src: photo }
  source.skinPhotos.push({ id: 'my-photo', date: '2026-09-29', createdAt: '2026-09-29T12:00:00Z', src: photo })
  const legacyRaw = JSON.stringify(source)
  const repo = repository()
  const name = repo.name
  const migrated = await repo.loadOrMigrate(legacyRaw, createDemoState())
  assert.equal(migrated.notes.length, source.notes.length)
  assert.equal(migrated.notes.at(-1).body, 'Keep this')
  assert.match(migrated.imageAssets[0].src, /^lumen-media:/)
  assert.equal(migrated.imageAssets[0].src, migrated.skinPhotos[0].src)
  assert.equal(JSON.stringify(source), legacyRaw)
  const portable = await repo.portableState(migrated)
  assert.equal(portable.imageAssets[0].src, photo)
  assert.equal(portable.skinPhotos[0].src, photo)
  await repo.close()

  const reopened = new IndexedDbRepository(name)
  const afterRestart = await reopened.loadOrMigrate(null, createDemoState())
  assert.equal(afterRestart.notes.at(-1).body, 'Keep this')
  assert.equal((await reopened.portableState(afterRestart)).imageAssets[0].src, photo)
  await reopened.close()
})

test('incremental transaction saves changed records and ordering across reloads', async () => {
  const repo = repository()
  const name = repo.name
  const before = await repo.loadOrMigrate(null, createDemoState())
  const newNote = { id: 'new-note', title: 'New', body: 'Survives reload', tags: [], relatedNoteIds: [], pinned: false }
  const next = { ...before, notes: [newNote, ...before.notes], tasks: before.tasks.slice().reverse(), treeGrowth: 93 }
  await repo.saveChanged(before, next)
  await repo.close()
  const reopened = new IndexedDbRepository(name)
  const loaded = await reopened.loadOrMigrate(null, createDemoState())
  assert.equal(loaded.notes[0].body, 'Survives reload')
  assert.equal(loaded.tasks[0].id, before.tasks.at(-1).id)
  assert.equal(loaded.treeGrowth, 93)
  await reopened.close()
})

test('last local save and backup-file verification survive reload without claiming a download', async () => {
  const repo = repository()
  const name = repo.name
  const before = await repo.loadOrMigrate(null, createDemoState())
  const initialSave = await repo.getLastLocalSaveAt()
  assert.ok(Date.parse(initialSave))
  assert.equal(await repo.getBackupVerification(), null)
  const next = { ...before, notes: [{ id: 'saved-note', title: 'Saved', body: 'Body', tags: [], relatedNoteIds: [], pinned: false }, ...before.notes] }
  await repo.saveChanged(before, next)
  assert.ok(Date.parse(await repo.getLastLocalSaveAt()) >= Date.parse(initialSave))
  const checked = { checkedAt: new Date().toISOString(), archiveCreatedAt: '2026-09-29T11:00:00.000Z', checksum: 'checked-checksum' }
  await repo.recordBackupVerification(checked)
  await repo.close()
  const reopened = new IndexedDbRepository(name)
  await reopened.loadOrMigrate(null, createDemoState())
  assert.deepEqual(await reopened.getBackupVerification(), checked)
  assert.ok(await reopened.getLastLocalSaveAt())
  await reopened.close()
})

test('daily completion events and a dated workout session survive reload', async () => {
  const repo = repository()
  const name = repo.name
  const before = await repo.loadOrMigrate(null, createDemoState())
  const next = {
    ...before,
    tasks: before.tasks.map((task) => task.id === 'task-1' ? { ...task, completedOn: [{ date: '2026-09-29', at: '2026-09-29T08:00:00Z' }] } : task),
    healthPlans: [...before.healthPlans, { id: 'plan-2026-09-29', date: '2026-09-29', title: 'Strength', focus: 'Upper', warmupMinutes: 5, notes: '', exercises: [{ id: 'press', exerciseId: 'exercise-shoulder', sets: 2, reps: 10, unit: 'reps', phase: 'main' }], session: { startedAt: '2026-09-29T09:00:00Z', activeIndex: 0, completedSets: { press: 1 } } }],
  }
  await repo.saveChanged(before, next)
  await repo.close()
  const reopened = new IndexedDbRepository(name)
  const loaded = await reopened.loadOrMigrate(null, createDemoState())
  assert.deepEqual(loaded.tasks.find((task) => task.id === 'task-1').completedOn, next.tasks[0].completedOn)
  assert.deepEqual(loaded.healthPlans.find((plan) => plan.date === '2026-09-29').session, next.healthPlans.at(-1).session)
  await reopened.close()
})

test('failed multi-record write aborts atomically and can be retried', async () => {
  const repo = repository()
  const before = await repo.loadOrMigrate(null, createDemoState())
  const extra = (id) => ({ id, title: id, body: id, tags: [], relatedNoteIds: [], pinned: false })
  const next = { ...before, notes: [extra('okay-note'), extra('quota-note'), ...before.notes] }
  const oldPut = IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put = function (value, key) {
    if (value?.value?.id === 'quota-note') throw new DOMException('Storage full', 'QuotaExceededError')
    return oldPut.call(this, value, key)
  }
  try { await assert.rejects(repo.saveChanged(before, next), /Storage full/) }
  finally { IDBObjectStore.prototype.put = oldPut }
  const stillOld = await repo.loadOrMigrate(null, createDemoState())
  assert.equal(stillOld.notes.some((note) => note.id === 'okay-note'), false)
  await repo.saveChanged(before, next)
  const saved = await repo.loadOrMigrate(null, createDemoState())
  assert.equal(saved.notes[0].id, 'okay-note')
  assert.equal(saved.notes[1].id, 'quota-note')
  await repo.close()
})

test('failed verification never activates a replacement snapshot', async () => {
  const repo = repository()
  const before = await repo.loadOrMigrate(null, createDemoState())
  const replacement = { ...before, notes: [
    { id: 'replacement', title: 'Replacement', body: 'New version', tags: [], relatedNoteIds: [], pinned: false },
  ] }
  repo.verifyMedia = async () => { throw new Error('Simulated interrupted verification') }
  await assert.rejects(repo.replaceAll(replacement), /interrupted verification/)
  const active = await repo.loadOrMigrate(null, createDemoState())
  assert.equal(active.notes.length, before.notes.length)
  assert.equal(active.notes[0].id, before.notes[0].id)
  await repo.close()
})

test('new image uploads keep the original bytes through save, reload, and export', async () => {
  const repo = repository()
  const name = repo.name
  const before = await repo.loadOrMigrate(null, createDemoState())
  const original = new Blob([Uint8Array.from([0, 1, 2, 127, 254, 255])], { type: 'image/png' })
  const src = repo.stageImage(original)
  const next = { ...before, imageAssets: [{ id: 'uploaded-image', title: 'Upload', src, categoryId: 'cat-design' }, ...before.imageAssets] }
  await repo.saveChanged(before, next)
  await repo.close()

  const reopened = new IndexedDbRepository(name)
  const stored = await reopened.loadOrMigrate(null, createDemoState())
  assert.match(stored.imageAssets[0].src, /^lumen-media:/)
  const portable = await reopened.portableState(stored)
  assert.equal(portable.imageAssets[0].src, 'data:image/png;base64,AAECf/7/')
  const archive = await createBackup(portable)
  const checked = await readBackup(archive.text)
  assert.equal(checked.data.imageAssets[0].src, portable.imageAssets[0].src)
  await reopened.close()

  const clean = repository()
  const restored = await clean.replaceAll(checked.data)
  const restoredPortable = await clean.portableState(restored)
  assert.equal(restoredPortable.imageAssets[0].src, portable.imageAssets[0].src)
  await clean.close()
})

test('restore drill: clean installation recovers a personal note, journal, project, and photo', async () => {
  const source = repository()
  const before = await source.loadOrMigrate(null, createDemoState())
  const src = source.stageImage(new Blob([Uint8Array.from([5, 10, 20, 30])], { type: 'image/png' }))
  const personal = {
    ...before,
    notes: [...before.notes, { id: 'restore-note', title: 'Important', body: 'Private words', tags: [], relatedNoteIds: [], pinned: false }],
    journalEntries: [...before.journalEntries, { id: 'restore-journal', date: '2026-09-29', title: 'Today', mode: 'free', mood: 3, onMind: 'Remember this' }],
    projects: [...before.projects, { id: 'restore-project', title: 'My work', status: 'Active', progress: 10, description: 'Description', color: '#c4b3a0', nextTaskIds: [], noteIds: ['restore-note'], imageIds: ['restore-image'], activity: [] }],
    imageAssets: [...before.imageAssets, { id: 'restore-image', title: 'My photo', src, tags: [], projectIds: ['restore-project'], collectionIds: [], origin: 'upload', height: 'medium', createdAt: '2026-09-29' }],
  }
  await source.saveChanged(before, personal)
  const stored = await source.loadOrMigrate(null, createDemoState())
  const originalBytes = (await source.portableState(stored)).imageAssets.at(-1).src
  const archive = await createBackup(await source.portableState(stored))
  const checked = await readBackup(archive.text)
  const clean = repository()
  const restored = await clean.replaceAll(checked.data)
  const reread = await clean.loadOrMigrate(null, createDemoState())
  assert.equal(restored.notes.find((note) => note.id === 'restore-note').body, 'Private words')
  assert.equal(reread.journalEntries.find((entry) => entry.id === 'restore-journal').onMind, 'Remember this')
  assert.equal(reread.projects.find((project) => project.id === 'restore-project').imageIds[0], 'restore-image')
  assert.equal((await clean.portableState(reread)).imageAssets.find((image) => image.id === 'restore-image').src, originalBytes)
  assert.equal((await source.loadOrMigrate(null, createDemoState())).notes.some((note) => note.id === 'restore-note'), true)
  await clean.close()
  await source.close()
})

test('older localStorage migration is repeatable and preserves personal records', async () => {
  const legacy = createDemoState()
  legacy.version = 5
  legacy.notes.push({ id: 'my-own-note', title: 'Mine', body: 'Keep me', tags: [], relatedNoteIds: [], pinned: true })
  const raw = JSON.stringify(legacy)
  const repo = repository()
  const first = await repo.loadOrMigrate(raw, createDemoState())
  const second = await repo.loadOrMigrate(raw, createDemoState())
  assert.equal(first.version, 6)
  assert.equal(second.notes.length, first.notes.length)
  assert.equal(second.notes.filter((note) => note.id === 'my-own-note').length, 1)
  assert.equal(second.notes.find((note) => note.id === 'my-own-note').body, 'Keep me')
  assert.equal(JSON.stringify(legacy), raw)
  await repo.close()
})
