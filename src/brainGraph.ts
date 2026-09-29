import type { Note } from './types'

export interface MapNode {
  id: string
  label: string
  kind: 'note' | 'thought'
  x: number
  y: number
  size: number
  accent?: string
}

export interface BrainGraph {
  nodes: MapNode[]
  links: Array<[string, string]>
}

/** The original constellation uses this reserved ID range; keep legacy copies recognizable. */
export const isSampleGraphNote = (note: Pick<Note, 'id'>) => /^graph-note-\d+$/.test(note.id)

const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function position(index: number): [number, number] {
  const cluster = index % 12
  const hubAngle = cluster * Math.PI * 2 / 12 + .2
  const hubRadius = 23 + noise(cluster + 40) * 12
  const angle = index * 2.399963 + noise(index + 17) * .5
  const radius = index < 12 ? 0 : Math.sqrt(noise(index + 71)) * 17
  let x = Math.cos(hubAngle) * hubRadius + Math.cos(angle) * radius
  let y = Math.sin(hubAngle) * hubRadius + Math.sin(angle) * radius
  const distance = Math.hypot(x, y)
  if (distance > 46) { x *= 46 / distance; y *= 46 / distance }
  return [Math.max(3, Math.min(97, x + 50)), Math.max(3, Math.min(97, y + 50))]
}

/** Pure, indexed graph model. No note is removed or changed by drawing it. */
export function buildBrainGraph(notes: Note[], query = ''): BrainGraph {
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery
    ? notes.filter((note) => `${note.title} ${note.body} ${note.tags.join(' ')}`.toLowerCase().includes(normalizedQuery))
    : notes

  const nodes = visible.map((note, index): MapNode => {
    const demoNumber = /^graph-note-(\d+)$/.exec(note.id)
    const graphIndex = demoNumber ? Number(demoNumber[1]) - 1 : index + 432
    const [x, y] = position(graphIndex)
    return {
      id: note.id,
      label: note.title,
      kind: 'note',
      x,
      y,
      size: graphIndex < 12 ? 7 : 1.5 + noise(graphIndex + 9) * 3,
    }
  })

  const visibleIds = new Set(nodes.map((node) => node.id))
  const seen = new Set<string>()
  const links: Array<[string, string]> = []
  for (const note of visible) {
    for (const relatedId of note.relatedNoteIds) {
      if (note.id === relatedId || !visibleIds.has(relatedId)) continue
      const key = note.id < relatedId ? `${note.id}\u0000${relatedId}` : `${relatedId}\u0000${note.id}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push([note.id, relatedId])
    }
  }
  return { nodes, links }
}
