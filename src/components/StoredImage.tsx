import React, { useEffect, useRef, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { appRepository } from '../storage/indexedDbRepository'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string; original?: boolean }

/** Resolve IndexedDB images only when their card enters the viewport. */
export function StoredImage({ src, original = false, ...props }: Props) {
  const elementRef = useRef<HTMLImageElement>(null)
  const [visible, setVisible] = useState(false)
  const [resolved, setResolved] = useState<string | undefined>(src?.startsWith('lumen-media:') ? undefined : src)

  useEffect(() => {
    if (!src?.startsWith('lumen-media:')) { setVisible(true); return }
    const element = elementRef.current
    if (!element || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '180px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [src])

  useEffect(() => {
    if (!src || !src.startsWith('lumen-media:')) { setResolved(src); return }
    if (!visible) { setResolved(undefined); return }
    let cancelled = false
    appRepository.imageUrl(src, !original).then((url) => { if (!cancelled) setResolved(url) }).catch(() => { if (!cancelled) setResolved(undefined) })
    return () => { cancelled = true }
  }, [src, original, visible])

  return <img {...props} ref={elementRef} src={resolved} loading={original ? 'eager' : 'lazy'} decoding="async" />
}
