import { useCallback, useEffect, useRef, useState } from 'react'
import { STORAGE_KEY } from '../backup'
import { createDemoState } from '../data/demoData'
import { appRepository } from '../storage/indexedDbRepository'
import type { BackupVerification } from '../storage/indexedDbRepository'
import type { AppState } from '../types'

export type SaveState = { kind: 'loading' | 'saving' | 'saved' | 'error'; savedAt?: string; error?: string }

let bootPromise: Promise<AppState> | null = null

function bootStorage() {
  if (!bootPromise) {
    let legacyRaw: string | null = null
    try { legacyRaw = window.localStorage.getItem(STORAGE_KEY) }
    catch { /* IndexedDB may still be available when localStorage is not. */ }
    bootPromise = appRepository.loadOrMigrate(legacyRaw, createDemoState()).finally(() => {
      bootPromise = null
    })
  }
  return bootPromise
}

export function useAppStorage() {
  const [data, setData] = useState<AppState>(createDemoState)
  const [ready, setReady] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'loading' })
  const [backupVerification, setBackupVerification] = useState<BackupVerification | null>(null)
  const currentRef = useRef(data)
  const persistedRef = useRef<AppState | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const mountedRef = useRef(false)

  const begin = useCallback(async () => {
    setSaveState({ kind: 'loading' })
    try {
      const loaded = await bootStorage()
      const [savedAt, verification] = await Promise.all([appRepository.getLastLocalSaveAt(), appRepository.getBackupVerification()])
      if (!mountedRef.current) return
      persistedRef.current = loaded
      currentRef.current = loaded
      setData(loaded)
      setReady(true)
      setSaveState({ kind: 'saved', savedAt: savedAt ?? undefined })
      setBackupVerification(verification)
    } catch (failure) {
      if (!mountedRef.current) return
      setSaveState({ kind: 'error', error: failure instanceof Error ? failure.message : 'Could not open device storage.' })
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void begin()
    return () => { mountedRef.current = false }
  }, [begin])

  const enqueueSave = useCallback((snapshot: AppState) => {
    setSaveState((previous) => ({ kind: 'saving', savedAt: previous.savedAt }))
    queueRef.current = queueRef.current.then(async () => {
      const previous = persistedRef.current
      if (!previous || previous === snapshot) return
      await appRepository.saveChanged(previous, snapshot)
      const savedAt = await appRepository.getLastLocalSaveAt()
      persistedRef.current = snapshot
      if (mountedRef.current && currentRef.current === snapshot) setSaveState({ kind: 'saved', savedAt: savedAt ?? undefined })
    }).catch((failure) => {
      if (mountedRef.current) setSaveState((previous) => ({ kind: 'error', savedAt: previous.savedAt, error: failure instanceof Error ? failure.message : 'Changes could not be saved.' }))
    })
  }, [])

  useEffect(() => {
    currentRef.current = data
    if (ready && data !== persistedRef.current) enqueueSave(data)
  }, [data, ready, enqueueSave])

  const retrySave = useCallback(() => {
    if (!ready) { void begin(); return }
    enqueueSave(currentRef.current)
  }, [ready, begin, enqueueSave])

  const replaceData = useCallback(async (restored: AppState) => {
    await queueRef.current
    setSaveState((previous) => ({ kind: 'saving', savedAt: previous.savedAt }))
    try {
      const loaded = await appRepository.replaceAll(restored)
      const savedAt = await appRepository.getLastLocalSaveAt()
      persistedRef.current = loaded
      currentRef.current = loaded
      setData(loaded)
      setSaveState({ kind: 'saved', savedAt: savedAt ?? undefined })
    } catch (failure) {
      setSaveState((previous) => ({ kind: 'error', savedAt: previous.savedAt, error: failure instanceof Error ? failure.message : 'Restore could not be saved.' }))
      throw failure
    }
  }, [])

  const portableState = useCallback((snapshot: AppState) => appRepository.portableState(snapshot), [])
  const stageImage = useCallback((file: Blob) => appRepository.stageImage(file), [])
  const recordBackupVerification = useCallback(async (value: BackupVerification) => {
    await appRepository.recordBackupVerification(value)
    if (mountedRef.current) setBackupVerification(value)
  }, [])

  return {
    data, setData, ready, saveState, retrySave, replaceData, backupVerification, recordBackupVerification,
    stageImage, portableState,
  }
}
