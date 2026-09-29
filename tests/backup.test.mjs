import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBackup, readBackup } from '../src/backup.ts'
import { createDemoState } from '../src/data/demoData.ts'

function stateWithPersonalData() {
  const data = createDemoState()
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
  data.notes.push({ id: 'my-note', title: 'My note', body: 'Private text', tags: [], relatedNoteIds: [], pinned: false })
  data.journalEntries.push({ id: 'my-journal', date: '2026-09-29', title: 'My day', mode: 'daily', mood: 4, howWasToday: 'Good', whatHappened: 'Something', whatWasGood: 'A walk', onMind: 'Plans' })
  data.projects.push({ id: 'my-project', title: 'My project', status: 'Active', progress: 12, description: 'A description', color: '#c4b3a0', nextTaskIds: [], noteIds: ['my-note'], imageIds: ['my-image'], activity: [] })
  data.imageAssets.push({ id: 'my-image', title: 'My photo', src: image, palette: ['#aaa', '#bbb', '#ccc'], tags: [], projectIds: ['my-project'], collectionIds: [], origin: 'upload', height: 'medium', createdAt: '2026-09-29' })
  data.skinPhotos.push({ id: 'my-skin-photo', date: '2026-09-29', src: image, createdAt: '2026-09-29T12:00:00Z' })
  return data
}

test('archive includes all records and full embedded image bytes', async () => {
  const data = stateWithPersonalData()
  const { text, fileName, summary } = await createBackup(data)
  const restored = await readBackup(text)
  assert.match(fileName, /^lumen-backup-.*\.json$/)
  assert.deepEqual(restored.data, data)
  assert.equal(restored.data.imageAssets.at(-1).src, data.imageAssets.at(-1).src)
  assert.equal(restored.summary.counts.notes, data.notes.length)
  assert.equal(restored.summary.counts.journalEntries, data.journalEntries.length)
  assert.equal(restored.summary.counts.projects, data.projects.length)
  assert.equal(summary.embeddedImages, 1)
})

test('archive rejects changed content and record counts', async () => {
  const archive = JSON.parse((await createBackup(stateWithPersonalData())).text)
  archive.data.notes.at(-1).body = 'Altered'
  await assert.rejects(readBackup(JSON.stringify(archive)), /integrity check/)
  archive.data.notes.at(-1).body = 'Private text'
  archive.summary.counts.notes -= 1
  await assert.rejects(readBackup(JSON.stringify(archive)), /record counts/)
})

test('archive rejects malformed and unrelated files', async () => {
  await assert.rejects(readBackup('{'), /valid JSON/)
  await assert.rejects(readBackup('{}'), /supported Lumen backup/)
  const archive = JSON.parse((await createBackup(stateWithPersonalData())).text)
  archive.data.imageAssets.at(-1).src = 42
  await assert.rejects(readBackup(JSON.stringify(archive)), /invalid image/)
  archive.data.imageAssets.at(-1).src = 'data:image/png;base64,AAAA'
  archive.data.version = 999
  await assert.rejects(readBackup(JSON.stringify(archive)), /newer Lumen version/)
})
