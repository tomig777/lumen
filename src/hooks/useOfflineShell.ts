import { useEffect, useRef, useState } from 'react'

export type OfflineShell = {
  ready: boolean
  updateAvailable: boolean
  online: boolean
  applyUpdate: () => void
}

export function useOfflineShell(): OfflineShell {
  const [ready, setReady] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadForUpdate = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let cancelled = false
    let registration: ServiceWorkerRegistration | null = null
    const check = () => {
      if (cancelled || !registration) return
      setReady(!!registration.active)
      setUpdateAvailable(!!registration.waiting)
    }
    const onControllerChange = () => {
      if (reloadForUpdate.current) window.location.reload()
      else check()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void registration?.update().catch(() => undefined)
    }
    const onOnline = () => { setOnline(true); onVisibility() }
    const onOffline = () => setOnline(false)
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then((result) => {
      if (cancelled) return
      registration = result
      registrationRef.current = result
      result.addEventListener('updatefound', () => {
        result.installing?.addEventListener('statechange', check)
      })
      check()
      void result.update().catch(() => undefined)
    }).catch(() => { if (!cancelled) setReady(false) })
    return () => {
      cancelled = true
      registrationRef.current = null
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return {
    ready,
    updateAvailable,
    online,
    applyUpdate: () => {
      const waiting = registrationRef.current?.waiting
      if (!waiting) return
      reloadForUpdate.current = true
      waiting.postMessage({ type: 'LUMEN_APPLY_UPDATE' })
    },
  }
}
