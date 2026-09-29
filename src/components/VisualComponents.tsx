import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Brain, ChevronRight, Clock3, Folder, Heart, House, Image as ImageIcon, Layers3, Pause, Play, Plus, Sparkles, SkipBack, SkipForward, Users } from 'lucide-react'
import type { ImageAsset, Person, Tab, Track } from '../types'
import { StoredImage } from './StoredImage'
import peoplePortraits from '../people-portraits-collage.png'

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
  icon: 'people' | 'inspiration' | 'journal' | 'focus' | 'collections' | 'health-journal' | 'quick-note'
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
  if (icon === 'health-journal') return <Heart size={16} strokeWidth={2} />
  return <Sparkles size={16} strokeWidth={2} />
}

export function BottomNav({ active, onChange, quickActions, motionId = 'default' }: BottomNavProps) {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActionMenuOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setIsActionMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsActionMenuOpen(false)
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
          className={`nav-item ${active === item.id ? 'is-active' : ''} ${item.id === 'home' ? 'is-home' : ''}`}
          key={item.id}
          onClick={() => { setIsActionMenuOpen(false); onChange(item.id) }}
          aria-label={item.label}
          aria-current={active === item.id ? 'page' : undefined}
        >
          {active === item.id && <motion.span layoutId={`nav-active-bubble-${motionId}`} className="nav-active-bubble" transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }} aria-hidden="true" />}
          <motion.span className="nav-icon-wrap" animate={active === item.id ? { y: -1 } : { y: 0 }}>
            <NavGlyph icon={item.icon} />
          </motion.span>
        </button>
      ))}
      <AnimatePresence>
        {isActionMenuOpen && <motion.div className="nav-action-menu" initial={{ opacity: 0, y: 14, scale: .88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .92 }} transition={{ type: 'spring', damping: 24, stiffness: 360 }}>
          <div className="nav-action-grid">
            {quickActions.map((action, index) => <motion.button key={action.id} className={`nav-action-item ${action.id === 'quick-note' ? 'is-primary' : ''}`} onClick={() => selectAction(action)} initial={{ opacity: 0, y: 8, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: .9 }} transition={{ delay: index * .035, type: 'spring', damping: 22, stiffness: 420 }}><span className="nav-action-icon"><ActionGlyph icon={action.icon} /></span><span>{action.label}</span></motion.button>)}
          </div>
        </motion.div>}
      </AnimatePresence>
      <motion.button className="nav-capture" onClick={() => setIsActionMenuOpen((open) => !open)} aria-label={isActionMenuOpen ? 'Close quick actions' : 'Open quick actions'} aria-expanded={isActionMenuOpen} animate={{ rotate: isActionMenuOpen ? 45 : 0 }} transition={{ type: 'spring', damping: 18, stiffness: 320 }}><Plus size={20} /></motion.button>
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

export interface MapNode {
  id: string
  label: string
  kind: 'note' | 'thought'
  x: number
  y: number
  size: number
  accent?: string
}

export function BrainMap({ nodes, links }: { nodes: MapNode[]; links: Array<[string, string]> }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<{ id: string; pointerId: number; clientX: number; clientY: number; lastClientX: number; lastClientY: number; lastTime: number; x: number; y: number; currentX: number; currentY: number; velocityX: number; velocityY: number; moved: boolean } | null>(null)
  const driftFrames = useRef<Map<string, number>>(new Map())
  const positionFor = (node: MapNode) => positions[node.id] ?? { x: node.x, y: node.y }
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  useEffect(() => () => {
    driftFrames.current.forEach((frame) => window.cancelAnimationFrame(frame))
    driftFrames.current.clear()
  }, [])

  const cancelNodeDrift = (nodeId: string) => {
    const frame = driftFrames.current.get(nodeId)
    if (frame !== undefined) window.cancelAnimationFrame(frame)
    driftFrames.current.delete(nodeId)
  }

  const driftNode = (node: MapNode, start: { x: number; y: number }, velocityX: number, velocityY: number, bounds: DOMRect) => {
    cancelNodeDrift(node.id)
    const weight = .72 + node.size / 34
    let x = start.x
    let y = start.y
    let speedX = Math.max(-.026, Math.min(.026, (velocityX / bounds.width) * 100 * weight))
    let speedY = Math.max(-.026, Math.min(.026, (velocityY / bounds.height) * 100 * weight))
    const edgePaddingX = Math.max(3, (node.size / 2 / bounds.width) * 100)
    const edgePaddingY = Math.max(3, (node.size / 2 / bounds.height) * 100)
    let previousTime = window.performance.now()
    const startedAt = previousTime

    const tick = (time: number) => {
      const elapsed = time - startedAt
      const delta = Math.min(32, Math.max(8, time - previousTime))
      previousTime = time
      x += speedX * delta
      y += speedY * delta
      if (x <= edgePaddingX || x >= 100 - edgePaddingX) speedX *= -.24
      if (y <= edgePaddingY || y >= 100 - edgePaddingY) speedY *= -.24
      x = Math.max(edgePaddingX, Math.min(100 - edgePaddingX, x))
      y = Math.max(edgePaddingY, Math.min(100 - edgePaddingY, y))
      const dragFactor = Math.pow(.885, delta / 16.67)
      speedX *= dragFactor
      speedY *= dragFactor
      setPositions((current) => ({ ...current, [node.id]: { x, y } }))
      if (elapsed < 820 && Math.hypot(speedX, speedY) > .00032) {
        driftFrames.current.set(node.id, window.requestAnimationFrame(tick))
      } else {
        driftFrames.current.delete(node.id)
      }
    }

    if (Math.hypot(speedX, speedY) > .00032) driftFrames.current.set(node.id, window.requestAnimationFrame(tick))
  }

  const startNodeDrag = (event: React.PointerEvent<HTMLButtonElement>, node: MapNode) => {
    cancelNodeDrift(node.id)
    const position = positionFor(node)
    drag.current = { id: node.id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, lastClientX: event.clientX, lastClientY: event.clientY, lastTime: event.timeStamp, x: position.x, y: position.y, currentX: position.x, currentY: position.y, velocityX: 0, velocityY: 0, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveNode = (event: React.PointerEvent<HTMLButtonElement>, node: MapNode) => {
    const activeDrag = drag.current
    const bounds = mapRef.current?.getBoundingClientRect()
    if (!activeDrag || activeDrag.id !== node.id || !bounds) return
    const deltaX = event.clientX - activeDrag.clientX
    const deltaY = event.clientY - activeDrag.clientY
    const sampleTime = event.timeStamp
    const sampleDelta = Math.max(8, sampleTime - activeDrag.lastTime)
    const sampledVelocityX = (event.clientX - activeDrag.lastClientX) / sampleDelta
    const sampledVelocityY = (event.clientY - activeDrag.lastClientY) / sampleDelta
    activeDrag.velocityX = activeDrag.velocityX * .38 + sampledVelocityX * .62
    activeDrag.velocityY = activeDrag.velocityY * .38 + sampledVelocityY * .62
    activeDrag.lastClientX = event.clientX
    activeDrag.lastClientY = event.clientY
    activeDrag.lastTime = sampleTime
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) activeDrag.moved = true
    const edgePaddingX = Math.max(3, (node.size / 2 / bounds.width) * 100)
    const edgePaddingY = Math.max(3, (node.size / 2 / bounds.height) * 100)
    const nextPosition = {
      x: Math.max(edgePaddingX, Math.min(100 - edgePaddingX, activeDrag.x + (deltaX / bounds.width) * 100)),
      y: Math.max(edgePaddingY, Math.min(100 - edgePaddingY, activeDrag.y + (deltaY / bounds.height) * 100)),
    }
    activeDrag.currentX = nextPosition.x
    activeDrag.currentY = nextPosition.y
    setPositions((current) => ({
      ...current,
      [node.id]: nextPosition,
    }))
    event.stopPropagation()
  }

  const finishNodeDrag = (event: React.PointerEvent<HTMLButtonElement>, node: MapNode) => {
    const activeDrag = drag.current
    const bounds = mapRef.current?.getBoundingClientRect()
    if (activeDrag?.id === node.id && activeDrag.moved) {
      if (bounds) driftNode(node, { x: activeDrag.currentX, y: activeDrag.currentY }, activeDrag.velocityX, activeDrag.velocityY, bounds)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    event.stopPropagation()
  }

  return (
    <div className="brain-map" ref={mapRef} role="group" aria-label="Connected note graph">
      <div className="map-canvas">
        <svg className="map-links" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g className="map-connections">{links.map(([from, to]) => {
            const a = nodeById.get(from)
            const b = nodeById.get(to)
            if (!a || !b) return null
            const aPosition = positionFor(a)
            const bPosition = positionFor(b)
            return <line className="map-note-link" key={`${from}-${to}`} x1={aPosition.x} y1={aPosition.y} x2={bPosition.x} y2={bPosition.y} />
          })}</g>
          <g className="map-note-points">
            {nodes.map((node) => {
              const position = positionFor(node)
              return <circle key={`point-${node.id}`} cx={position.x} cy={position.y} r={node.size / 12} />
            })}
          </g>
        </svg>
        {nodes.map((node) => {
          const position = positionFor(node)
          const hitSize = Math.max(6, node.size + 3)
          return <button
            type="button"
            className={`map-node ${node.kind === 'thought' ? 'is-thought' : ''}`}
            key={node.id}
            aria-label={node.label}
            title={node.label}
            style={{ left: `calc(${position.x}% - ${hitSize / 2}px)`, top: `calc(${position.y}% - ${hitSize / 2}px)`, width: hitSize, height: hitSize, '--node-diameter': `${node.size}px` } as React.CSSProperties}
            onPointerDown={(event) => startNodeDrag(event, node)}
            onPointerMove={(event) => moveNode(event, node)}
            onPointerUp={(event) => finishNodeDrag(event, node)}
            onPointerCancel={(event) => finishNodeDrag(event, node)}
          >
            <span aria-hidden="true">{node.label}</span>
          </button>
        })}
      </div>
    </div>
  )
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
