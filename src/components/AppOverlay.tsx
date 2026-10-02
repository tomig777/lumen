import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Keep an app overlay out of page scrollers and animated containing blocks. */
export function AppOverlay({ children }: { children: React.ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    setHost(anchor.current?.closest<HTMLElement>('.phone-app') ?? null)
  }, [])
  return <><span ref={anchor} hidden />{host && createPortal(children, host)}</>
}
