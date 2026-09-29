import { createDemoState } from '../data/demoData'
import type { AppState } from '../types'

/** Bring an older localStorage snapshot up to the current in-app shape without changing it in place. */
export function normalizeLegacyState(value: unknown): AppState {
  if (typeof value !== 'object' || value === null || !('notes' in value) || !Array.isArray(value.notes) ||
      !('tasks' in value) || !Array.isArray(value.tasks) ||
      !('projects' in value) || !Array.isArray(value.projects)) {
    throw new Error('The old Lumen data is incomplete. Its original copy has not been changed.')
  }
  const current = value as AppState
  const defaults = createDemoState()
  const needsBaseMigration = !current.healthPlans || !current.wellnessLogs || !current.skincareRoutine || !current.skinPhotos || !current.brainCategories
  const needsBrainDemoMigration = current.version < 6
  if (!needsBaseMigration && !needsBrainDemoMigration) return current

  const defaultNotesById = new Map(defaults.notes.map((note) => [note.id, note]))
  const refreshedCurrentNotes = needsBrainDemoMigration ? current.notes.map((note) => {
    const demo = defaultNotesById.get(note.id)
    return note.id.startsWith('graph-note-') && demo
      ? { ...note, relatedNoteIds: Array.from(new Set([...note.relatedNoteIds, ...demo.relatedNoteIds])) }
      : note
  }) : current.notes
  const demoNetworkNotes = needsBrainDemoMigration ? defaults.notes.filter((note) => !refreshedCurrentNotes.some((item) => item.id === note.id)) : []
  const nextNotes = [...refreshedCurrentNotes, ...demoNetworkNotes]
  const nextNoteIds = new Set(nextNotes.map((note) => note.id))
  const currentCategories = current.brainCategories ?? defaults.brainCategories
  const nextCategories = needsBrainDemoMigration ? currentCategories.map((category) => {
    const demoCategory = defaults.brainCategories.find((item) => item.id === category.id)
    return demoCategory ? { ...category, noteIds: Array.from(new Set([...category.noteIds, ...demoCategory.noteIds.filter((id) => nextNoteIds.has(id))])) } : category
  }) : currentCategories

  return {
    ...current,
    version: Math.max(current.version, 6),
    notes: nextNotes,
    brainCategories: nextCategories,
    healthPlans: current.healthPlans ?? defaults.healthPlans,
    wellnessLogs: current.wellnessLogs ?? defaults.wellnessLogs,
    skincareRoutine: current.skincareRoutine ?? defaults.skincareRoutine,
    skinPhotos: current.skinPhotos ?? defaults.skinPhotos,
  }
}
