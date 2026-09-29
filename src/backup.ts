import type { AppState } from './types'

export const STORAGE_KEY = 'personal-os-demo-v1'
const BACKUP_FORMAT = 'lumen-data-backup'
const BACKUP_VERSION = 1
const SUPPORTED_DATA_VERSION = 6

const collectionNames = [
  'tasks', 'habits', 'thoughts', 'notes', 'brainCategories', 'projects',
  'people', 'journalEntries', 'healthEntries', 'exercises', 'workouts',
  'healthPlans', 'wellnessLogs', 'skinPhotos', 'focusSessions',
  'imageAssets', 'collections', 'tracks',
] as const

type CollectionName = typeof collectionNames[number]

export interface BackupSummary {
  counts: Record<CollectionName, number>
  embeddedImages: number
}

interface BackupArchive {
  format: typeof BACKUP_FORMAT
  formatVersion: typeof BACKUP_VERSION
  createdAt: string
  summary: BackupSummary
  checksum: string
  data: AppState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertState(value: unknown): asserts value is AppState {
  if (!isRecord(value) || !Number.isInteger(value.version) || Number(value.version) < 1) {
    throw new Error('This file does not contain valid Lumen data.')
  }
  if (Number(value.version) > SUPPORTED_DATA_VERSION) {
    throw new Error('This backup was made by a newer Lumen version. Update the app before restoring it.')
  }
  if (typeof value.treeGrowth !== 'number' || !Number.isFinite(value.treeGrowth) ||
      !Number.isInteger(value.currentTrackIndex) || typeof value.isPlaying !== 'boolean') {
    throw new Error('The backup is missing required app settings.')
  }
  for (const name of collectionNames) {
    if (!Array.isArray(value[name]) || !value[name].every((item: unknown) => isRecord(item) && typeof item.id === 'string' && item.id.length > 0)) {
      throw new Error(`The backup has invalid ${name} records.`)
    }
  }
  if (!isRecord(value.skincareRoutine) || !Array.isArray(value.skincareRoutine.morning) ||
      !Array.isArray(value.skincareRoutine.night)) {
    throw new Error('The backup is missing the skincare routine.')
  }
  for (const asset of value.imageAssets as AppState['imageAssets']) {
    if (typeof asset.title !== 'string' || (asset.src !== undefined && typeof asset.src !== 'string')) throw new Error('The backup has an invalid image.')
  }
  for (const photo of value.skinPhotos as AppState['skinPhotos']) {
    if (typeof photo.src !== 'string') throw new Error('The backup has an invalid skin photo.')
  }
  for (const note of value.notes as AppState['notes']) {
    if (typeof note.title !== 'string' || typeof note.body !== 'string' || !Array.isArray(note.tags) || !Array.isArray(note.relatedNoteIds)) {
      throw new Error('The backup has an invalid note.')
    }
  }
  for (const project of value.projects as AppState['projects']) {
    if (typeof project.title !== 'string' || !Array.isArray(project.noteIds) || !Array.isArray(project.imageIds)) {
      throw new Error('The backup has an invalid project.')
    }
  }
  for (const entry of value.journalEntries as AppState['journalEntries']) {
    if (typeof entry.title !== 'string' || typeof entry.date !== 'string' || typeof entry.onMind !== 'string') {
      throw new Error('The backup has an invalid journal entry.')
    }
  }
}

function summaryFor(data: AppState): BackupSummary {
  const counts = {} as BackupSummary['counts']
  for (const name of collectionNames) counts[name] = data[name].length
  const imageSources = new Set<string>()
  for (const asset of data.imageAssets) if (asset.src?.startsWith('data:image/')) imageSources.add(asset.src)
  for (const photo of data.skinPhotos) if (photo.src.startsWith('data:image/')) imageSources.add(photo.src)
  for (const log of data.wellnessLogs) if (log.skinPhoto?.startsWith('data:image/')) imageSources.add(log.skinPhoto)
  for (const category of data.brainCategories) if (category.image?.startsWith('data:image/')) imageSources.add(category.image)
  return { counts, embeddedImages: imageSources.size }
}

async function checksumFor(serialized: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createBackup(data: AppState) {
  assertState(data)
  const createdAt = new Date().toISOString()
  const archive: BackupArchive = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    createdAt,
    summary: summaryFor(data),
    checksum: await checksumFor(JSON.stringify(data)),
    data,
  }
  const fileName = `lumen-backup-${createdAt.slice(0, 19).replace(/:/g, '-')}.json`
  return { fileName, text: JSON.stringify(archive), summary: archive.summary }
}

export async function readBackup(text: string): Promise<BackupArchive> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || parsed.formatVersion !== BACKUP_VERSION) {
    throw new Error('This is not a supported Lumen backup file.')
  }
  assertState(parsed.data)
  if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt)) ||
      typeof parsed.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.checksum) || !isRecord(parsed.summary)) {
    throw new Error('The backup header is incomplete.')
  }
  const data = parsed.data
  const summary = summaryFor(data)
  const claimedCounts = parsed.summary.counts
  if (!isRecord(claimedCounts) || parsed.summary.embeddedImages !== summary.embeddedImages ||
      collectionNames.some((name) => claimedCounts[name] !== summary.counts[name])) {
    throw new Error('The backup record counts do not match its contents.')
  }
  if (await checksumFor(JSON.stringify(data)) !== parsed.checksum) {
    throw new Error('The backup failed its integrity check. Nothing was restored.')
  }
  return parsed as unknown as BackupArchive
}

export function currentDataSummary(data: AppState): BackupSummary {
  return summaryFor(data)
}
