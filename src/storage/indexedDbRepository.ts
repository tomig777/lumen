import { assertState, collectionNames } from '../backup'
import { normalizeLegacyState } from './migrateLegacy'
import type { AppState, BrainCategory, ImageAsset, SkinPhoto, WellnessLog } from '../types'

const DATABASE_NAME = 'lumen-device-v1'
const MEDIA_PREFIX = 'lumen-media:'
const allStores = [...collectionNames, 'media', 'settings'] as const
type Collection = typeof collectionNames[number]
type StoredRow = { key: string; generation: string; id: string; position: number; value: AppState[Collection][number] }
type Preferences = Pick<AppState, 'version' | 'treeGrowth' | 'skincareRoutine' | 'currentTrackIndex' | 'isPlaying'>
type Snapshot = { key: string; value: Preferences; verified: boolean; updatedAt: string }
type Active = { key: 'active'; generation: string }
export type BackupVerification = { checkedAt: string; archiveCreatedAt: string; checksum: string }
type StoredMedia = { id: string; original: Blob; thumbnail?: Blob; checksum: string }

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Device storage read failed.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Device storage transaction was cancelled.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Device storage transaction failed.'))
  })
}

function readWrite(db: IDBDatabase, stores: string[]): IDBTransaction {
  try { return db.transaction(stores, 'readwrite', { durability: 'strict' }) }
  catch { return db.transaction(stores, 'readwrite') }
}

function preferencesFor(data: AppState): Preferences {
  return {
    version: data.version,
    treeGrowth: data.treeGrowth,
    skincareRoutine: data.skincareRoutine,
    currentTrackIndex: data.currentTrackIndex,
    isPlaying: data.isPlaying,
  }
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function blobFromDataUrl(source: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(source)
  if (!match) throw new Error('An uploaded image has invalid data. Nothing was changed.')
  const bytes = match[2] ? Uint8Array.from(atob(match[3]), (character) => character.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[3]))
  return new Blob([bytes], { type: match[1] || 'application/octet-stream' })
}

async function dataUrlFromBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192))
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function createThumbnail(original: Blob): Promise<Blob | undefined> {
  if (typeof document === 'undefined' || typeof Image === 'undefined' || !original.type.startsWith('image/')) return undefined
  const url = URL.createObjectURL(original)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const width = Math.min(image.naturalWidth, 360)
    const height = Math.max(1, Math.round(image.naturalHeight * width / image.naturalWidth))
    if (!Number.isFinite(height) || width < 1) return undefined
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height)
    return await new Promise<Blob | undefined>((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/jpeg', .78))
  } catch {
    return undefined // An unsupported image still keeps its untouched original.
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The only storage boundary used by the app; a future sync layer can wrap it. */
export class IndexedDbRepository {
  private databasePromise: Promise<IDBDatabase> | null = null
  private staged = new Map<string, Blob>()
  private sourceIds = new Map<string, string>()
  private sourceUrls = new Map<string, string>()
  private preparedMedia = new Map<string, Promise<StoredMedia>>()
  private activeGeneration: string | null = null

  constructor(private readonly name = DATABASE_NAME) {}

  private open(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        for (const name of collectionNames) {
          const store = db.createObjectStore(name, { keyPath: 'key' })
          store.createIndex('generation', 'generation')
        }
        db.createObjectStore('media', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
      request.onerror = () => reject(request.error ?? new Error('Could not open device storage.'))
      request.onblocked = () => reject(new Error('Close other Lumen tabs and retry opening device storage.'))
    }).catch((error) => { this.databasePromise = null; throw error })
    return this.databasePromise
  }

  /** Keep the original File available for retry if a save fails. */
  stageImage(file: Blob): string {
    const id = `image-${crypto.randomUUID()}`
    const url = URL.createObjectURL(file)
    this.staged.set(id, file)
    this.sourceIds.set(url, id)
    return url
  }

  private async prepareMedia(id: string): Promise<StoredMedia | null> {
    const original = this.staged.get(id)
    if (!original) return null
    if (!this.preparedMedia.has(id)) {
      this.preparedMedia.set(id, (async () => ({ id, original, thumbnail: await createThumbnail(original), checksum: await sha256(original) }))())
    }
    return this.preparedMedia.get(id)!
  }

  private async referenceFor(source: string | undefined): Promise<string | undefined> {
    if (!source || source.startsWith(MEDIA_PREFIX)) return source
    if (!source.startsWith('data:image/') && !source.startsWith('blob:')) return source
    const known = this.sourceIds.get(source)
    if (known) return `${MEDIA_PREFIX}${known}`
    const original = source.startsWith('data:') ? blobFromDataUrl(source) : await (await fetch(source)).blob()
    const id = `sha256-${await sha256(original)}`
    this.sourceIds.set(source, id)
    this.staged.set(id, original)
    return `${MEDIA_PREFIX}${id}`
  }

  private async normalizeRecord(name: Collection, item: AppState[Collection][number]): Promise<AppState[Collection][number]> {
    if (name === 'imageAssets') {
      const asset = item as ImageAsset
      return { ...asset, src: await this.referenceFor(asset.src) } as AppState[Collection][number]
    }
    if (name === 'skinPhotos') {
      const photo = item as SkinPhoto
      return { ...photo, src: (await this.referenceFor(photo.src))! } as AppState[Collection][number]
    }
    if (name === 'wellnessLogs') {
      const log = item as WellnessLog
      return { ...log, skinPhoto: await this.referenceFor(log.skinPhoto) } as AppState[Collection][number]
    }
    if (name === 'brainCategories') {
      const category = item as BrainCategory
      return { ...category, image: await this.referenceFor(category.image) } as AppState[Collection][number]
    }
    return item
  }

  private async prepareFull(data: AppState) {
    const normalized = { ...data }
    const ids = new Set<string>()
    for (const name of collectionNames) {
      const values: AppState[Collection][number][] = []
      for (const item of data[name]) values.push(await this.normalizeRecord(name, item))
      ;(normalized as unknown as Record<string, unknown>)[name] = values
      for (const value of values) this.collectMediaIds(value, ids)
    }
    const media: StoredMedia[] = []
    for (const id of ids) {
      const item = await this.prepareMedia(id)
      if (item) media.push(item)
    }
    return { normalized, ids, media }
  }

  private collectMediaIds(value: unknown, ids: Set<string>) {
    if (typeof value !== 'object' || value === null) return
    for (const field of ['src', 'skinPhoto', 'image']) {
      const source = (value as Record<string, unknown>)[field]
      if (typeof source === 'string' && source.startsWith(MEDIA_PREFIX)) ids.add(source.slice(MEDIA_PREFIX.length))
    }
  }

  private async active(): Promise<string | null> {
    const db = await this.open()
    const transaction = db.transaction('settings', 'readonly')
    const done = transactionDone(transaction)
    const record = await requestValue(transaction.objectStore('settings').get('active')) as Active | undefined
    await done
    return record?.generation ?? null
  }

  async getLastLocalSaveAt(): Promise<string | null> {
    const db = await this.open()
    const transaction = db.transaction('settings', 'readonly')
    const done = transactionDone(transaction)
    const record = await requestValue(transaction.objectStore('settings').get('lastLocalSaveAt')) as { value?: string } | undefined
    await done
    return record?.value ?? null
  }

  async getBackupVerification(): Promise<BackupVerification | null> {
    const db = await this.open()
    const transaction = db.transaction('settings', 'readonly')
    const done = transactionDone(transaction)
    const record = await requestValue(transaction.objectStore('settings').get('lastBackupVerification')) as { value?: BackupVerification } | undefined
    await done
    return record?.value ?? null
  }

  async recordBackupVerification(value: BackupVerification): Promise<void> {
    const transaction = readWrite(await this.open(), ['settings'])
    const done = transactionDone(transaction)
    transaction.objectStore('settings').put({ key: 'lastBackupVerification', value })
    await done
  }

  private async readGeneration(generation: string): Promise<AppState> {
    const db = await this.open()
    const transaction = db.transaction([...collectionNames, 'settings'], 'readonly')
    const done = transactionDone(transaction)
    const collections = collectionNames.map((name) => requestValue(transaction.objectStore(name).index('generation').getAll(generation)) as Promise<StoredRow[]>)
    const snapshot = requestValue(transaction.objectStore('settings').get(`snapshot:${generation}`)) as Promise<Snapshot | undefined>
    const [rows, settings] = await Promise.all([Promise.all(collections), snapshot])
    await done
    if (!settings) throw new Error('The device storage snapshot is incomplete. The old copy was not changed.')
    const state = { ...settings.value } as AppState
    collectionNames.forEach((name, index) => {
      ;(state as unknown as Record<string, unknown>)[name] = rows[index].sort((a, b) => a.position - b.position).map((row) => row.value)
    })
    assertState(state)
    return state
  }

  async loadOrMigrate(legacyRaw: string | null, defaults: AppState): Promise<AppState> {
    const existing = await this.active()
    if (existing) {
      this.activeGeneration = existing
      return this.readGeneration(existing)
    }
    let source = defaults
    if (legacyRaw) {
      let parsed: unknown
      try { parsed = JSON.parse(legacyRaw) }
      catch { throw new Error('The old browser data could not be read. It has not been changed.') }
      source = normalizeLegacyState(parsed)
    }
    assertState(source)
    return this.replaceAll(source)
  }

  /** Stage and verify a new generation, then atomically switch the active pointer. */
  async replaceAll(data: AppState): Promise<AppState> {
    assertState(data)
    const generation = crypto.randomUUID()
    const { normalized, ids, media } = await this.prepareFull(data)
    const db = await this.open()
    const transaction = readWrite(db, [...allStores])
    const done = transactionDone(transaction)
    try {
      for (const name of collectionNames) {
        const store = transaction.objectStore(name)
        normalized[name].forEach((value, position) => store.put({ key: `${generation}:${value.id}`, generation, id: value.id, position, value }))
      }
      for (const item of media) transaction.objectStore('media').put(item)
      transaction.objectStore('settings').put({ key: `snapshot:${generation}`, value: preferencesFor(normalized), verified: false, updatedAt: new Date().toISOString() } satisfies Snapshot)
    } catch (error) {
      transaction.abort()
      await done.catch(() => undefined)
      throw error
    }
    await done

    // Verification happens before the active generation changes. A failed or interrupted
    // migration leaves the previous active snapshot (and old localStorage record) usable.
    const reread = await this.readGeneration(generation)
    const recordsMatch = collectionNames.every((name) => JSON.stringify(reread[name]) === JSON.stringify(normalized[name]))
    const settingsMatch = JSON.stringify(preferencesFor(reread)) === JSON.stringify(preferencesFor(normalized))
    if (!recordsMatch || !settingsMatch) throw new Error('Device storage verification failed. The previous data is still active.')
    await this.verifyMedia(ids)
    const switchTransaction = readWrite(db, ['settings'])
    const switched = transactionDone(switchTransaction)
    switchTransaction.objectStore('settings').put({ key: `snapshot:${generation}`, value: preferencesFor(normalized), verified: true, updatedAt: new Date().toISOString() } satisfies Snapshot)
    switchTransaction.objectStore('settings').put({ key: 'active', generation } satisfies Active)
    switchTransaction.objectStore('settings').put({ key: 'lastLocalSaveAt', value: new Date().toISOString() })
    await switched
    this.activeGeneration = generation
    for (const item of media) { this.staged.delete(item.id); this.preparedMedia.delete(item.id) }
    // Imported data URLs can contain entire photographs. Do not retain those
    // strings in memory once the verified Blobs have been committed.
    for (const source of this.sourceIds.keys()) if (source.startsWith('data:')) this.sourceIds.delete(source)
    return reread
  }

  private async verifyMedia(ids: Set<string>): Promise<void> {
    if (!ids.size) return
    const db = await this.open()
    const transaction = db.transaction('media', 'readonly')
    const done = transactionDone(transaction)
    const store = transaction.objectStore('media')
    const records = await Promise.all([...ids].map((id) => requestValue(store.get(id)) as Promise<StoredMedia | undefined>))
    await done
    for (const record of records) {
      if (!record || await sha256(record.original) !== record.checksum) {
        throw new Error('An image failed verification. The previous data is still active.')
      }
    }
  }

  /** Write only changed records and settings in one transaction. */
  async saveChanged(previous: AppState, next: AppState): Promise<void> {
    assertState(next)
    const generation = this.activeGeneration ?? await this.active()
    if (!generation) throw new Error('Device storage is not ready.')
    const changes = new Map<Collection, { puts: StoredRow[]; deletes: string[] }>()
    const mediaIds = new Set<string>()
    for (const name of collectionNames) {
      if (previous[name] === next[name]) continue
      const oldRows = new Map(previous[name].map((item, position) => [item.id, { item, position }]))
      const newIds = new Set(next[name].map((item) => item.id))
      const deletes = previous[name].filter((item) => !newIds.has(item.id)).map((item) => `${generation}:${item.id}`)
      const puts: StoredRow[] = []
      for (let position = 0; position < next[name].length; position++) {
        const item = next[name][position]
        const old = oldRows.get(item.id)
        if (old?.item === item && old.position === position) continue
        const value = await this.normalizeRecord(name, item)
        this.collectMediaIds(value, mediaIds)
        puts.push({ key: `${generation}:${item.id}`, generation, id: item.id, position, value })
      }
      if (puts.length || deletes.length) changes.set(name, { puts, deletes })
    }
    const media = (await Promise.all([...mediaIds].map((id) => this.prepareMedia(id)))).filter((item): item is StoredMedia => item !== null)
    const settingsChanged = previous.version !== next.version || previous.treeGrowth !== next.treeGrowth ||
      previous.skincareRoutine !== next.skincareRoutine || previous.currentTrackIndex !== next.currentTrackIndex || previous.isPlaying !== next.isPlaying
    if (!changes.size && !media.length && !settingsChanged) return
    const scope = [...changes.keys(), ...(media.length ? ['media'] : []), 'settings']
    const transaction = readWrite(await this.open(), scope)
    const done = transactionDone(transaction)
    try {
      for (const [name, { puts, deletes }] of changes) {
        const store = transaction.objectStore(name)
        for (const key of deletes) store.delete(key)
        for (const row of puts) store.put(row)
      }
      for (const item of media) transaction.objectStore('media').put(item)
      if (settingsChanged) transaction.objectStore('settings').put({ key: `snapshot:${generation}`, value: preferencesFor(next), verified: true, updatedAt: new Date().toISOString() } satisfies Snapshot)
      transaction.objectStore('settings').put({ key: 'lastLocalSaveAt', value: new Date().toISOString() })
    } catch (error) {
      transaction.abort()
      await done.catch(() => undefined)
      throw error
    }
    await done
    for (const item of media) { this.staged.delete(item.id); this.preparedMedia.delete(item.id) }
  }

  private async originalFor(source: string): Promise<Blob> {
    const id = source.startsWith(MEDIA_PREFIX) ? source.slice(MEDIA_PREFIX.length) : this.sourceIds.get(source)
    if (!id) {
      if (source.startsWith('data:')) return blobFromDataUrl(source)
      if (source.startsWith('blob:')) return (await fetch(source)).blob()
      throw new Error('An image could not be found in device storage.')
    }
    const staged = this.staged.get(id)
    if (staged) return staged
    const db = await this.open()
    const transaction = db.transaction('media', 'readonly')
    const done = transactionDone(transaction)
    const record = await requestValue(transaction.objectStore('media').get(id)) as StoredMedia | undefined
    await done
    if (!record) throw new Error('An image is missing from device storage.')
    return record.original
  }

  async imageUrl(source: string | undefined, thumbnail = true): Promise<string | undefined> {
    if (!source || !source.startsWith(MEDIA_PREFIX)) return source
    const cacheKey = `${source}:${thumbnail ? 'thumb' : 'original'}`
    const cached = this.sourceUrls.get(cacheKey)
    if (cached) return cached
    const id = source.slice(MEDIA_PREFIX.length)
    const db = await this.open()
    const transaction = db.transaction('media', 'readonly')
    const done = transactionDone(transaction)
    const record = await requestValue(transaction.objectStore('media').get(id)) as StoredMedia | undefined
    await done
    if (!record) throw new Error('An image is missing from device storage.')
    const url = URL.createObjectURL(thumbnail && record.thumbnail ? record.thumbnail : record.original)
    this.sourceUrls.set(cacheKey, url)
    return url
  }

  /** Materialize originals only when exporting; object URLs are never placed in a backup. */
  async portableState(data: AppState): Promise<AppState> {
    const sources = new Map<string, Promise<string>>()
    const portable = async (source: string | undefined) => {
      if (!source || (!source.startsWith(MEDIA_PREFIX) && !source.startsWith('blob:'))) return source
      if (!sources.has(source)) sources.set(source, this.originalFor(source).then(dataUrlFromBlob))
      return sources.get(source)!
    }
    return {
      ...data,
      imageAssets: await Promise.all(data.imageAssets.map(async (asset) => ({ ...asset, src: await portable(asset.src) }))),
      skinPhotos: await Promise.all(data.skinPhotos.map(async (photo) => ({ ...photo, src: (await portable(photo.src))! }))),
      wellnessLogs: await Promise.all(data.wellnessLogs.map(async (log) => ({ ...log, skinPhoto: await portable(log.skinPhoto) }))),
      brainCategories: await Promise.all(data.brainCategories.map(async (category) => ({ ...category, image: await portable(category.image) }))),
    }
  }

  async close(): Promise<void> {
    if (this.databasePromise) (await this.databasePromise).close()
    this.databasePromise = null
    for (const url of this.sourceUrls.values()) URL.revokeObjectURL(url)
    this.sourceUrls.clear()
  }
}

export const appRepository = new IndexedDbRepository()
