export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'current' | 'available' | 'offline' | 'error' | 'unsupported'

export type OfflineUpdateState = {
  ready: boolean
  updateAvailable: boolean
  status: UpdateStatus
  lastCheckedAt: string | null
}

type Options = {
  serviceWorkers: ServiceWorkerContainer | null
  isOnline: () => boolean
  onState: (state: OfflineUpdateState) => void
  onApply: () => void
}

/** Observe existing installs as well as future ones; never reset user storage. */
export function createOfflineUpdateMonitor({ serviceWorkers, isOnline, onState, onApply }: Options) {
  let disposed = false
  let registration: ServiceWorkerRegistration | null = null
  let opening: Promise<ServiceWorkerRegistration | null> | null = null
  let checking: Promise<void> | null = null
  let applying = false
  let reloadRequired = false
  let wasControlled = !!serviceWorkers?.controller
  const workers = new Map<ServiceWorker, () => void>()
  let state: OfflineUpdateState = {
    ready: false, updateAvailable: false,
    status: serviceWorkers ? 'idle' : 'unsupported', lastCheckedAt: null,
  }

  const refresh = (status = state.status) => {
    if (disposed) return
    const updateAvailable = !!registration?.waiting || reloadRequired
    state = { ...state, ready: !!registration?.active, updateAvailable,
      status: updateAvailable ? 'available' : status }
    onState({ ...state })
  }

  const watch = (worker: ServiceWorker | null) => {
    if (!worker || workers.has(worker)) return
    const changed = () => {
      if (disposed) return
      if (worker.state === 'redundant' && !registration?.waiting && !reloadRequired) refresh('error')
      else if (registration?.waiting || reloadRequired) refresh('available')
      else if (worker.state === 'activated') refresh('current')
      else refresh('downloading')
    }
    workers.set(worker, changed)
    worker.addEventListener('statechange', changed)
  }
  const updateFound = () => {
    watch(registration?.installing ?? null)
    refresh('downloading')
  }
  const controllerChanged = () => {
    if (disposed) return
    if (applying) { onApply(); return }
    // Another tab can activate a new shell while this page retains old code.
    // Offer an explicit reload rather than mislabelling this page as current.
    reloadRequired = wasControlled
    wasControlled = !!serviceWorkers?.controller
    refresh(reloadRequired ? 'available' : 'current')
  }

  const start = () => {
    if (opening) return opening
    if (!serviceWorkers || disposed) { refresh('unsupported'); return Promise.resolve(null) }
    serviceWorkers.addEventListener('controllerchange', controllerChanged)
    opening = serviceWorkers.getRegistration('./').then((existing) => {
      if (existing) return existing
      return isOnline() ? serviceWorkers.register('./sw.js', { scope: './', updateViaCache: 'none' }) : null
    }).then((result) => {
      if (disposed) return null
      if (!result) { opening = null; refresh(isOnline() ? 'error' : 'offline'); return null }
      registration = result
      result.addEventListener('updatefound', updateFound)
      // updatefound may have fired before register() resolved.
      watch(result.installing)
      refresh(result.installing ? 'downloading' : 'idle')
      return result
    }).catch(() => {
      opening = null // A later explicit check may retry registration.
      serviceWorkers.removeEventListener('controllerchange', controllerChanged)
      refresh(isOnline() ? 'error' : 'offline')
      return null
    })
    return opening
  }

  const checkForUpdates = () => {
    if (checking) return checking
    if (disposed) return Promise.resolve()
    if (!serviceWorkers) { refresh('unsupported'); return Promise.resolve() }
    refresh(isOnline() ? 'checking' : 'offline')
    checking = (async () => {
      try {
        const result = await start()
        if (!result || disposed) return
        if (!isOnline()) { refresh('offline'); return }
        if (result.installing) { watch(result.installing); refresh('downloading'); return }
        await result.update()
        if (disposed) return
        if (!isOnline()) { refresh('offline'); return }
        // install can fail before update() resolves; do not overwrite that error.
        if (state.status === 'error') return
        state = { ...state, lastCheckedAt: new Date().toISOString() }
        watch(result.installing)
        refresh(result.installing ? 'downloading' : 'current')
      } catch {
        refresh(isOnline() ? 'error' : 'offline')
      }
    })().finally(() => { checking = null })
    return checking
  }

  return {
    start, checkForUpdates,
    applyUpdate() {
      if (disposed) return
      const waiting = registration?.waiting
      if (!waiting && !reloadRequired) return
      applying = true
      try {
        if (waiting) waiting.postMessage({ type: 'LUMEN_APPLY_UPDATE' })
        else onApply()
      } catch { applying = false; refresh('error') }
    },
    dispose() {
      disposed = true
      serviceWorkers?.removeEventListener('controllerchange', controllerChanged)
      registration?.removeEventListener('updatefound', updateFound)
      for (const [worker, listener] of workers) worker.removeEventListener('statechange', listener)
      workers.clear()
    },
  }
}

export const updateStatusText: Record<UpdateStatus, string> = {
  idle: 'Not checked yet',
  checking: 'Checking for updates…',
  downloading: 'Downloading update…',
  current: 'No newer update found',
  available: 'Update ready to apply',
  offline: 'Connect to check for updates',
  error: 'Could not check or download · try again',
  unsupported: 'Updates unavailable in this browser',
}
