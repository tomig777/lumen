import { useSyncExternalStore } from 'react'

/** Appearance is device UI state, deliberately outside personal-data backups. */
export type AppTheme = 'dark' | 'light'
export const THEME_KEY = 'lumen-appearance-v1'
export const DEFAULT_THEME: AppTheme = 'dark'
export const THEME_EVENT = 'lumen-theme-change'

export function normalizeTheme(value: unknown): AppTheme {
  return value === 'light' ? 'light' : DEFAULT_THEME
}

export function readTheme(): AppTheme {
  try { return normalizeTheme(window.localStorage.getItem(THEME_KEY)) }
  catch { return DEFAULT_THEME }
}

// The inline bootstrap already selected this before first paint. Keep the DOM
// choice if storage is unavailable; do not read or rewrite app record snapshots.
let theme: AppTheme = typeof document === 'undefined' ? DEFAULT_THEME
  : normalizeTheme(document.documentElement.getAttribute('data-lumen-theme') ?? readTheme())
const listeners = new Set<() => void>()

function applyTheme(next: AppTheme) {
  theme = next
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-lumen-theme', next)
    if (document.documentElement.hasAttribute('data-lumen-launch')) document.documentElement.setAttribute('data-lumen-launch', next)
    document.documentElement.style.colorScheme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#24211e' : '#f7f3ed')
    document.dispatchEvent(new Event(THEME_EVENT))
  }
  for (const listener of listeners) listener()
}

/** Change immediately; return false if this device could not persist the choice.
 * Settings can report that separately from the personal-data save indicator. */
export function setAppTheme(next: AppTheme): boolean {
  if (next !== 'dark' && next !== 'light') return false
  let saved = true
  try { window.localStorage.setItem(THEME_KEY, next) }
  catch { saved = false }
  applyTheme(next)
  return saved
}

function onStorage(event: StorageEvent) {
  if (event.key !== THEME_KEY && event.key !== null) return
  // Ignore unrelated storage areas and values; no other app data is touched.
  try { if (event.storageArea && event.storageArea !== window.localStorage) return }
  catch { return }
  applyTheme(normalizeTheme(event.newValue))
}

function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', onStorage)
  }
}

export function useAppTheme(): AppTheme {
  return useSyncExternalStore(subscribe, () => theme, () => DEFAULT_THEME)
}
