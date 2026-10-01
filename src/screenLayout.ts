export type ScreenLayoutReport = { rows: [string, string][] }

export function iosVersion(userAgent: string): string {
  return userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/)?.[1].replace(/_/g, '.') ?? 'Not reported'
}

export function formatScreenLayoutReport(report: ScreenLayoutReport): string {
  return ['Lumen screen layout', ...report.rows.map(([label, value]) => `${label}: ${value}`)].join('\n')
}

/** One user-requested snapshot. No app records, storage, network, or listeners. */
export function readScreenLayout(release: { version: string; build: string }): ScreenLayoutReport {
  const root = document.documentElement
  const px = (value: number) => String(Math.round(value * 10) / 10)
  const dimensions = (width: number, height: number) => `${px(width)} × ${px(height)}`
  const bounds = (element: Element | null) => {
    if (!element) return 'Not present'
    const rect = element.getBoundingClientRect()
    return `${px(rect.top)}–${px(rect.bottom)} (height ${px(rect.height)})`
  }
  const probes: HTMLElement[] = []
  const probe = (styles: string) => {
    const element = document.createElement('div')
    element.setAttribute('aria-hidden', 'true')
    element.dataset.lumenLayoutProbe = ''
    // Attach directly to body, outside animated page transforms. Never paint,
    // accept input, or enter normal flow; remove all probes even if a read fails.
    element.style.cssText = `all: initial; position: fixed; top: 0; left: 0; width: 0; margin: 0; border: 0; padding: 0; visibility: hidden; pointer-events: none; ${styles}`
    probes.push(element)
    document.body.appendChild(element)
    return element
  }
  try {
    const viewportUnits = ['vh', 'dvh', 'lvh'].map((unit) => {
      if (!CSS.supports('height', `100${unit}`)) return `${unit}=unsupported`
      return `${unit}=${px(probe(`height: 100${unit}`).getBoundingClientRect().height)}`
    }).join(', ')
    const fixed = bounds(probe('inset: 0; width: auto; height: auto'))
    const safe = getComputedStyle(probe('height: 0; padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)'))
    const viewport = window.visualViewport
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
    const shell = document.querySelector('.deployed-app-root')
    const shellStyle = shell ? getComputedStyle(shell) : null
    return { rows: [
      ['App', `${release.version} / ${release.build}`],
      ['iOS', iosVersion(navigator.userAgent)],
      ['Mode', standalone ? 'Home Screen / standalone' : 'Browser tab'],
      ['Screen', dimensions(window.screen.width, window.screen.height)],
      ['Window', dimensions(window.innerWidth, window.innerHeight)],
      ['Document', dimensions(root.clientWidth, root.clientHeight)],
      ['App top–bottom', bounds(shell)],
      ['Fixed inset=0', fixed],
      ['CSS heights', viewportUnits],
      ['Visual viewport', viewport ? `${dimensions(viewport.width, viewport.height)}; top ${px(viewport.offsetTop)}; scale ${px(viewport.scale)}` : 'Unavailable'],
      ['Safe T/R/B/L', `${safe.paddingTop} / ${safe.paddingRight} / ${safe.paddingBottom} / ${safe.paddingLeft}`],
      ['Document scroll', `${px(window.scrollX)}, ${px(window.scrollY)}; height ${px(root.scrollHeight)}`],
      ['App CSS height', shellStyle?.height ?? 'Not present'],
      ['Document color', getComputedStyle(root).backgroundColor],
      ['Body color', getComputedStyle(document.body).backgroundColor],
      ['Viewport meta', document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? 'Missing'],
      ['Status bar meta', document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute('content') ?? 'Missing'],
    ] }
  } finally {
    probes.forEach((element) => element.remove())
  }
}
