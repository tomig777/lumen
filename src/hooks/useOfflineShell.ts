import { useEffect, useRef, useState } from 'react'
import { createOfflineUpdateMonitor, type OfflineUpdateState } from '../offlineUpdates'

export type OfflineShell = OfflineUpdateState & {
  online: boolean
  checkForUpdates: () => void
  applyUpdate: () => void
}

export function useOfflineShell(): OfflineShell {
  const [state, setState] = useState<OfflineUpdateState>({ ready: false, updateAvailable: false, status: 'idle', lastCheckedAt: null })
  const [online, setOnline] = useState(navigator.onLine)
  const monitorRef = useRef<ReturnType<typeof createOfflineUpdateMonitor> | null>(null)

  useEffect(() => {
    const monitor = createOfflineUpdateMonitor({
      serviceWorkers: import.meta.env.PROD && 'serviceWorker' in navigator ? navigator.serviceWorker : null,
      isOnline: () => navigator.onLine,
      onState: setState,
      onApply: () => window.location.reload(),
    })
    monitorRef.current = monitor
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void monitor.checkForUpdates()
    }
    const onOnline = () => { setOnline(true); onVisibility() }
    const onOffline = () => { setOnline(false); void monitor.checkForUpdates() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    void monitor.checkForUpdates()
    return () => {
      monitorRef.current = null
      monitor.dispose()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return {
    ...state,
    online,
    checkForUpdates: () => { void monitorRef.current?.checkForUpdates() },
    applyUpdate: () => monitorRef.current?.applyUpdate(),
  }
}
