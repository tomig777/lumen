import { useCallback, useEffect, useRef, useState } from 'react'
import { STORAGE_KEY } from '../backup'
import { createDemoState } from '../data/demoData'
import { appRepository } from '../storage/indexedDbRepository'
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
  const currentRef = useRef(data)
  const persistedRef = useRef<AppState | null>(null)
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const mountedRef = useRef(false)

  const begin = useCallback(async () => {
    setSaveState({ kind: 'loading' })
    try {
      const loaded = await bootStorage()
      if (!mountedRef.current) return
      persistedRef.current = loaded
      currentRef.current = loaded
      setData(loaded)
      setReady(true)
      setSaveState({ kind: 'saved', savedAt: new Date().toISOString() })
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
    setSaveState({ kind: 'saving', savedAt: undefined })
    queueRef.current = queueRef.current.then(async () => {
      const previous = persistedRef.current
      if (!previous || previous === snapshot) return
      await appRepository.saveChanged(previous, snapshot)
      persistedRef.current = snapshot
      if (mountedRef.current && currentRef.current === snapshot) setSaveState({ kind: 'saved', savedAt: new Date().toISOString() })
    }).catch((failure) => {
      if (mountedRef.current) setSaveState({ kind: 'error', error: failure instanceof Error ? failure.message : 'Changes could not be saved.' })
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
    setSaveState({ kind: 'saving' })
    try {
      const loaded = await appRepository.replaceAll(restored)
      persistedRef.current = loaded
      currentRef.current = loaded
      setData(loaded)
      setSaveState({ kind: 'saved', savedAt: new Date().toISOString() })
    } catch (failure) {
      setSaveState({ kind: 'error', error: failure instanceof Error ? failure.message : 'Restore could not be saved.' })
      throw failure
    }
  }, [])

  const portableState = useCallback((snapshot: AppState) => appRepository.portableState(snapshot), [])
  const stageImage = useCallback((file: Blob) => appRepository.stageImage(file), [])

  return {
    data, setData, ready, saveState, retrySave, replaceData,
    stageImage, portableState,
  }
}
