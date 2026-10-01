export type EditorViewportMetrics = {
  editing: boolean
  layoutTop: number
  layoutHeight: number
  visualTop: number
  visualHeight: number
  scale: number
}

/** Constrain an editor, not the app shell, when an unzoomed keyboard obscures it. */
export function editorViewportFrame(metrics: EditorViewportMetrics): { top: number; height: number } | null {
  const { editing, layoutTop, layoutHeight, visualTop, visualHeight, scale } = metrics
  if (!editing || ![layoutTop, layoutHeight, visualTop, visualHeight, scale].every(Number.isFinite)) return null
  if (layoutHeight <= 0 || visualHeight <= 0 || Math.abs(scale - 1) > .01) return null

  const top = Math.max(layoutTop, visualTop)
  const bottom = Math.min(layoutTop + layoutHeight, visualTop + visualHeight)
  const height = bottom - top
  // A safe-area/browser-chrome difference alone must not be mistaken for a keyboard.
  if (height <= 0 || layoutHeight - height < Math.max(100, layoutHeight * .15)) return null
  return { top: Math.round(top - layoutTop), height: Math.floor(height) }
}
