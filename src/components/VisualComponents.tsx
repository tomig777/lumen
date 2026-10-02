import React, { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Brain, ChevronRight, Clock3, Folder, Heart, House, Image as ImageIcon, Layers3, Pause, Play, Plus, Settings, Sparkles, SkipBack, SkipForward, Users } from 'lucide-react'
import type { ImageAsset, Person, Tab, Track } from '../types'
import type { MapNode } from '../brainGraph'
import { StoredImage } from './StoredImage'
import peoplePortraits from '../people-portraits-collage.png'
import { THEME_EVENT } from '../theme'

interface PhoneFrameProps {
  children: React.ReactNode
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="phone-frame" aria-label="Lumen iPhone preview">
      <span className="phone-side-button phone-action-button" aria-hidden="true" />
      <span className="phone-side-button phone-volume-up" aria-hidden="true" />
      <span className="phone-side-button phone-volume-down" aria-hidden="true" />
      <span className="phone-side-button phone-power-button" aria-hidden="true" />
      <div className="phone-camera" />
      <div className="phone-screen">{children}</div>
    </div>
  )
}

export function StatusBar({ light = false }: { light?: boolean } = {}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className={`status-bar ${light ? 'is-light' : ''}`} aria-hidden="true">
      <span className="status-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      <div className="status-icons">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><rect y="8" width="3" height="4" rx=".8" /><rect x="4.5" y="5.5" width="3" height="6.5" rx=".8" /><rect x="9" y="3" width="3" height="9" rx=".8" /><rect x="13.5" width="3" height="12" rx=".8" /></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 3a11 11 0 0 1 14 0M3.5 6a7 7 0 0 1 9 0M6 9a3 3 0 0 1 4 0" /><circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none" /></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="currentColor"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45" /><rect x="2.5" y="2.5" width="17" height="7" rx="1.5" /><path d="M23 4v4c2-.3 2-3.7 0-4Z" opacity=".5" /></svg>
      </div>
    </div>
  )
}

interface BottomNavProps {
  active: Tab
  onChange: (tab: Tab) => void
  quickActions: BottomNavAction[]
  motionId?: string
}

export interface BottomNavAction {
  id: string
  label: string
  icon: 'people' | 'inspiration' | 'journal' | 'focus' | 'collections' | 'settings' | 'quick-note'
  onSelect: () => void
}

const navItems: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'brain', label: 'Brain', icon: 'brain' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'health', label: 'Health', icon: 'heart' },
]

function NavGlyph({ icon }: { icon: string }) {
  if (icon === 'brain') return <Brain size={20} strokeWidth={2.1} />
  if (icon === 'folder') return <Folder size={20} strokeWidth={2.1} />
  if (icon === 'heart') return <Heart size={20} strokeWidth={2.1} />
  return <House size={20} strokeWidth={2.1} />
}

function ActionGlyph({ icon }: { icon: BottomNavAction['icon'] }) {
  if (icon === 'people') return <Users size={16} strokeWidth={2} />
  if (icon === 'inspiration') return <ImageIcon size={16} strokeWidth={2} />
  if (icon === 'journal') return <BookOpen size={16} strokeWidth={2} />
  if (icon === 'focus') return <Clock3 size={16} strokeWidth={2} />
  if (icon === 'collections') return <Layers3 size={16} strokeWidth={2} />
  if (icon === 'settings') return <Settings size={16} strokeWidth={2} />
  return <Sparkles size={16} strokeWidth={2} />
}

export function BottomNav({ active, onChange, quickActions, motionId = 'default' }: BottomNavProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const captureRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isActionMenuOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setIsActionMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionMenuOpen(false)
        captureRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isActionMenuOpen])

  const selectAction = (action: BottomNavAction) => {
    setIsActionMenuOpen(false)
    action.onSelect()
  }

  return (
    <nav ref={navRef} className={`bottom-nav ${isActionMenuOpen ? 'is-action-menu-open' : ''}`} aria-label="Primary navigation">
      {navItems.map((item) => (
        <button
          type="button"
          className={`nav-item ${active === item.id ? 'is-active' : ''} ${item.id === 'home' ? 'is-home' : ''}`}
          key={item.id}
          onClick={() => { setIsActionMenuOpen(false); onChange(item.id) }}
          aria-label={item.label}
          aria-current={active === item.id ? 'page' : undefined}
        >
          {active === item.id && <motion.span layoutId={reducedMotion ? undefined : `nav-active-bubble-${motionId}`} className="nav-active-bubble" transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />}
          <motion.span className="nav-icon-wrap" animate={active === item.id && !reducedMotion ? { y: -1 } : { y: 0 }}>
            <NavGlyph icon={item.icon} />
          </motion.span>
        </button>
      ))}
      <AnimatePresence>
        {isActionMenuOpen && <motion.div id={menuId} className="nav-action-menu" initial={reducedMotion ? false : { opacity: 0, y: 14, scale: .88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: .92 }} transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 360 }}>
          <div className="nav-action-grid">
            {quickActions.map((action, index) => <motion.button type="button" key={action.id} className={`nav-action-item ${action.id === 'quick-note' ? 'is-primary' : ''}`} onClick={() => selectAction(action)} initial={reducedMotion ? false : { opacity: 0, y: 8, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: .9 }} transition={reducedMotion ? { duration: 0 } : { delay: index * .035, type: 'spring', damping: 22, stiffness: 420 }}><span className="nav-action-icon"><ActionGlyph icon={action.icon} /></span><span>{action.label}</span></motion.button>)}
          </div>
        </motion.div>}
      </AnimatePresence>
      <button ref={captureRef} type="button" className="nav-capture" onClick={() => setIsActionMenuOpen((open) => !open)} aria-label={isActionMenuOpen ? 'Close quick actions' : 'Open quick actions'} aria-expanded={isActionMenuOpen} aria-controls={isActionMenuOpen ? menuId : undefined}><motion.span className="nav-capture-icon" animate={{ rotate: isActionMenuOpen ? 45 : 0 }} transition={reducedMotion ? { duration: 0 } : { type: 'spring', damping: 18, stiffness: 320 }}><Plus size={20} /></motion.span></button>
    </nav>
  )
}

export function TreeVisual({ growth, compact = false }: { growth: number; compact?: boolean }) {
  const stage = growth < 20 ? 'seed' : growth < 50 ? 'sprout' : growth < 100 ? 'small plant' : growth < 200 ? 'young tree' : 'old tree'
  const branches = growth < 20 ? 1 : growth < 50 ? 2 : growth < 100 ? 4 : growth < 200 ? 6 : 8
  return (
    <div className={`tree-visual ${compact ? 'is-compact' : ''}`}>
      <motion.svg
        className="tree-svg"
        viewBox="0 0 180 160"
        role="img"
        aria-label={`${stage}, ${growth} growth`}
        initial={{ scale: 0.96, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <defs>
          <linearGradient id="trunkGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#4d3d34" />
            <stop offset="1" stopColor="#7e6251" />
          </linearGradient>
          <linearGradient id="leafGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#bfd29d" />
            <stop offset="1" stopColor="#648269" />
          </linearGradient>
        </defs>
        <ellipse cx="90" cy="144" rx="54" ry="9" fill="rgba(69, 83, 56, .11)" />
        <path d={growth < 20 ? 'M88 137 C88 134 90 132 91 129' : 'M87 139 C88 122 88 98 89 73 C89 66 88 57 85 49'} stroke="url(#trunkGradient)" strokeWidth={growth < 20 ? 2 : 8} fill="none" strokeLinecap="round" />
        {growth >= 50 && <path d="M89 103 C72 93 63 82 58 68 M89 94 C104 83 112 73 116 60 M89 78 C77 67 72 57 71 46 M90 75 C101 63 107 52 108 42" stroke="#614a3e" strokeWidth="3.5" fill="none" strokeLinecap="round" />}
        {Array.from({ length: branches }).map((_, index) => {
          const positions = [
            [60, 68, 15], [117, 60, 16], [72, 45, 14], [108, 42, 15], [51, 87, 14], [127, 83, 13], [84, 27, 13], [96, 21, 12],
          ]
          const [cx, cy, r] = positions[index]
          return <motion.circle key={index} cx={cx} cy={cy} r={r} fill="url(#leafGradient)" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ delay: index * 0.04, duration: 0.4 }} />
        })}
        {growth < 50 && <circle cx="90" cy="132" r={growth < 20 ? 4 : 11} fill="#91aa78" />}
      </motion.svg>
      {!compact && <div className="tree-caption"><span>{stage}</span><strong>{growth} growth</strong></div>}
    </div>
  )
}

export function BrainMap({ nodes, links, onOpenNode }: { nodes: MapNode[]; links: Array<[string, string]>; onOpenNode: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef(new Map<string, { x: number; y: number }>())
  const graphRef = useRef({ nodes, links, byId: new Map(nodes.map((node) => [node.id, node])) })
  const openRef = useRef(onOpenNode)
  const frameRef = useRef<number | null>(null)
  const visibleRef = useRef(true)
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null>(null)
  openRef.current = onOpenNode

  const point = (node: MapNode) => positionsRef.current.get(node.id) ?? node

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas || !visibleRef.current || document.visibilityState === 'hidden') return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.round(bounds.width * ratio)
    const height = Math.round(bounds.height * ratio)
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, bounds.width, bounds.height)
    const { nodes: currentNodes, links: currentLinks, byId } = graphRef.current
    context.beginPath()
    for (const [from, to] of currentLinks) {
      const a = byId.get(from)
      const b = byId.get(to)
      if (!a || !b) continue
      const start = point(a)
      const end = point(b)
      context.moveTo(start.x * bounds.width / 100, start.y * bounds.height / 100)
      context.lineTo(end.x * bounds.width / 100, end.y * bounds.height / 100)
    }
    const palette = getComputedStyle(canvas)
    context.strokeStyle = palette.getPropertyValue('--lumen-graph-line').trim() || 'rgba(232,217,199,.14)'
    context.lineWidth = .55
    context.stroke()
    context.fillStyle = palette.getPropertyValue('--lumen-graph-point').trim() || '#e8d9c7'
    for (const node of currentNodes) {
      const at = point(node)
      context.beginPath()
      context.arc(at.x * bounds.width / 100, at.y * bounds.height / 100, Math.max(.45, node.size * bounds.width / 1200), 0, Math.PI * 2)
      context.fill()
    }
    const selected = dragRef.current && byId.get(dragRef.current.id)
    if (selected) {
      const at = point(selected)
      context.beginPath()
      context.arc(at.x * bounds.width / 100, at.y * bounds.height / 100, 8, 0, Math.PI * 2)
      context.strokeStyle = palette.getPropertyValue('--lumen-graph-selected').trim() || '#d89c53'
      context.lineWidth = 1
      context.stroke()
    }
  }

  const scheduleDraw = () => {
    if (frameRef.current !== null) return
    frameRef.current = window.requestAnimationFrame(() => { frameRef.current = null; draw() })
  }

  useEffect(() => {
    graphRef.current = { nodes, links, byId: new Map(nodes.map((node) => [node.id, node])) }
    const ids = new Set(nodes.map((node) => node.id))
    for (const id of positionsRef.current.keys()) if (!ids.has(id)) positionsRef.current.delete(id)
    scheduleDraw()
  }, [nodes, links])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const resize = new ResizeObserver(scheduleDraw)
    resize.observe(map)
    const intersection = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      if (entry.isIntersecting) scheduleDraw()
    })
    intersection.observe(map)
    const onVisibility = () => { if (document.visibilityState === 'visible') scheduleDraw() }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener(THEME_EVENT, scheduleDraw)
    return () => {
      resize.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener(THEME_EVENT, scheduleDraw)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const nearest = (clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return null
    const x = clientX - bounds.left
    const y = clientY - bounds.top
    let found: MapNode | null = null
    let best = 14 * 14
    for (const node of graphRef.current.nodes) {
      const at = point(node)
      const dx = at.x * bounds.width / 100 - x
      const dy = at.y * bounds.height / 100 - y
      const distance = dx * dx + dy * dy
      if (distance < best) { best = distance; found = node }
    }
    return found
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const node = nearest(event.clientX, event.clientY)
    if (!node) return
    const at = point(node)
    dragRef.current = { id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: at.x, y: at.y, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    scheduleDraw()
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    if (!drag.moved) return
    positionsRef.current.set(drag.id, {
      x: Math.max(3, Math.min(97, drag.x + dx / bounds.width * 100)),
      y: Math.max(3, Math.min(97, drag.y + dy / bounds.height * 100)),
    })
    scheduleDraw()
  }

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    scheduleDraw()
    if (!cancelled && !drag.moved) openRef.current(drag.id)
  }

  return <div className="brain-map" ref={mapRef} role="group" aria-label={`Connected graph of ${nodes.length} notes. Tap a dot to open it, or use All notes for an accessible list.`}>
    <canvas ref={canvasRef} className="brain-map-render" aria-hidden="true" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={(event) => finishPointer(event, true)} />
  </div>
}

const peoplePositions = [
  { left: '34%', top: '31%', size: 28 },
  { left: '58%', top: '31%', size: 31 },
  { left: '20%', top: '41%', size: 27 },
  { left: '39%', top: '41%', size: 45 },
  { left: '61%', top: '41%', size: 46 },
  { left: '82%', top: '41%', size: 28 },
  { left: '31%', top: '51%', size: 42 },
  { left: '50%', top: '51%', size: 62 },
  { left: '70%', top: '51%', size: 44 },
  { left: '20%', top: '61%', size: 27 },
  { left: '39%', top: '61%', size: 46 },
  { left: '61%', top: '61%', size: 47 },
  { left: '82%', top: '61%', size: 28 },
  { left: '50%', top: '71%', size: 44 },
]

const peoplePebbleAspects = [1.025, .99, 1.018, .992, 1.022, .985, 1.015, 1.028, .988, 1.02, .986, 1.016, .99, 1.024]
// Keep the existing constellation intact, but feature the blonde portrait in the
// large center pebble (and move the portrait that was there to its old spot).
const peoplePortraitOrder = [0, 1, 2, 3, 4, 5, 6, 11, 8, 9, 10, 7, 12, 13]

export function PeopleCloud({ people, onSelect }: { people: Person[]; onSelect: (person: Person) => void }) {
  const bubbles = people.length ? peoplePositions.map((position, index) => ({ position, person: people[index % people.length], portraitIndex: peoplePortraitOrder[index] ?? index })) : []
  return (
    <div className="people-cloud">
      {bubbles.map(({ person, position, portraitIndex }, index) => {
        const portraitColumn = portraitIndex % 4
        const portraitRow = Math.floor(portraitIndex / 4)
        const pebbleAspect = peoplePebbleAspects[index % peoplePebbleAspects.length]
        const pebbleWidth = position.size * pebbleAspect
        const pebbleHeight = position.size * (2 - pebbleAspect)
        return (
        <motion.button
          key={`${person.id}-${index}`}
          className={`friend-bubble friend-pebble-${index % 4}`}
          aria-label={person.name}
          style={{ left: position.left, top: position.top, width: pebbleWidth, height: pebbleHeight, marginLeft: pebbleWidth / -2, marginTop: pebbleHeight / -2 } as React.CSSProperties}
          onClick={() => onSelect(person)}
          animate={{ x: [0, index % 2 ? 1.5 : -1.5, 0], y: [0, index % 3 ? -1.5 : 1.5, 0] }}
          transition={{ duration: 7 + index * .28, repeat: Infinity, ease: 'easeInOut', delay: index * .16 }}
          whileTap={{ scale: .9 }}
        >
          <span style={{ backgroundImage: `url(${peoplePortraits})`, backgroundSize: '400% 400%', backgroundPosition: `${portraitColumn * 100 / 3}% ${portraitRow * 100 / 3}%` }} />
        </motion.button>
        )
      })}
    </div>
  )
}

export function VisualArt({ asset, onClick, showLabel = false }: { asset: ImageAsset; onClick?: () => void; showLabel?: boolean }) {
  const style = {
    '--art-one': asset.palette[0],
    '--art-two': asset.palette[1],
    '--art-three': asset.palette[2],
  } as React.CSSProperties
  const content = asset.src ? <StoredImage src={asset.src} alt={asset.title} original={showLabel} /> : (
    <>
      <span className="art-orb orb-a" />
      <span className="art-orb orb-b" />
      <span className="art-line line-a" />
      <span className="art-line line-b" />
      <span className="art-grain" />
    </>
  )
  return (
    <button className={`visual-art art-${asset.height} ${onClick ? 'is-interactive' : ''}`} style={style} onClick={onClick} aria-label={asset.title}>
      {content}
      {showLabel && <span className="art-label">{asset.title}</span>}
    </button>
  )
}

export function MusicPlayer({ track, isPlaying, compact = false, onToggle, onNext, onPrevious }: { track: Track; isPlaying: boolean; compact?: boolean; onToggle: () => void; onNext: () => void; onPrevious?: () => void }) {
  return (
    <div className={`music-player ${compact ? 'is-compact' : ''}`}>
      <div className="music-cover" style={{ '--music-a': track.accent[0], '--music-b': track.accent[1] } as React.CSSProperties}><span /></div>
      <div className="music-copy"><strong>{track.title}</strong><span>{track.artist}</span></div>
      <div className="music-controls">
        {!compact && <button onClick={onPrevious} aria-label="Previous track"><SkipBack size={14} /></button>}
        <button className="music-play" onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
        <button onClick={onNext} aria-label="Next track"><SkipForward size={14} /></button>
      </div>
      {!compact && <ChevronRight size={15} className="music-chevron" />}
    </div>
  )
}
