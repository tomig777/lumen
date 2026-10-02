export type Tab = 'home' | 'brain' | 'projects' | 'health'

export type Screen =
  | Tab
  | 'welcome'
  | 'login'
  | 'backup'
  | 'settings'
  | 'project-detail'
  | 'people'
  | 'person-detail'
  | 'inspiration'
  | 'collections'
  | 'journal'
  | 'focus'
  | 'workout'
  | 'spotify'
  | 'mail'
  | 'pinterest'

export type SheetKind =
  | 'capture'
  | 'note'
  | 'thought-actions'
  | 'task'
  | 'project'
  | 'person'
  | 'health'
  | 'journal'
  | 'collection'
  | null

export interface SheetState {
  kind: SheetKind
  id?: string
  categoryId?: string
}

export interface Task {
  id: string
  title: string
  completed: boolean
  projectId?: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  recurrence?: 'once' | 'daily' | 'weekdays'
  completedOn?: { date: string; at: string }[]
}

export interface Habit {
  id: string
  title: string
  completed: boolean
  growth: number
}

export interface Thought {
  id: string
  text: string
  createdAt: string
  projectId?: string
  personId?: string
  pinned: boolean
}

export interface Note {
  id: string
  title: string
  body: string
  projectId?: string
  tags: string[]
  relatedNoteIds: string[]
  pinned: boolean
}

export type BrainCategoryIcon = 'sparkles' | 'book' | 'image' | 'compass'

export interface BrainCategory {
  id: string
  name: string
  color: string
  icon: BrainCategoryIcon
  image?: string
  noteIds: string[]
}

export interface Project {
  id: string
  title: string
  status: 'Active' | 'Paused' | 'Done'
  progress: number
  description: string
  color: string
  nextTaskIds: string[]
  noteIds: string[]
  imageIds: string[]
  activity: string[]
}

export interface Person {
  id: string
  name: string
  initials: string
  color: string
  size: 'small' | 'medium' | 'large'
  birthday: string
  likes: string[]
  dislikes: string[]
  remember: string[]
  gifts: string[]
  notes: string
}

export interface JournalEntry {
  id: string
  date: string
  createdAt?: string
  title: string
  mode: 'daily' | 'free'
  mood: number
  howWasToday: string
  whatHappened: string
  whatWasGood: string
  onMind: string
  projectId?: string
}

export interface HealthEntry {
  id: string
  date: string
  updatedAt?: string
  energy: number
  sleep: string
  workout: string
  notes: string
}

export interface Exercise {
  id: string
  name: string
  workoutGuideId?: string
  sets: number
  reps: number
  description: string
  equipment?: string
  visual?: string
  videoUrl?: string
}

export interface Workout {
  id: string
  name: string
  exerciseIds: string[]
  completedSets: Record<string, number>
}

export type PlannedExerciseUnit = 'reps' | 'seconds'
export type PlannedExercisePhase = 'warmup' | 'main' | 'cooldown'

export interface PlannedExercise {
  id: string
  exerciseId: string
  sets: number
  reps: number
  unit: PlannedExerciseUnit
  phase: PlannedExercisePhase
}

export interface DayPlan {
  id: string
  date: string
  title: string
  focus: string
  warmupMinutes: number
  exercises: PlannedExercise[]
  notes: string
  session?: {
    startedAt: string
    completedAt?: string
    activeIndex: number
    completedSets: Record<string, number>
  }
}

export interface WellnessLog {
  id: string
  date: string
  updatedAt?: string
  water: number
  meals: number
  skincare: boolean
  waterDl?: number
  mealKcal?: number
  skincareMorning?: boolean
  skincareNight?: boolean
  skinPhoto?: string
  notes?: string
}

export interface SkincareRoutine {
  morning: string[]
  night: string[]
}

export interface SkinPhoto {
  id: string
  date: string
  src: string
  createdAt: string
}

export interface FocusSession {
  id: string
  mode: string
  minutes: number
  completedAt?: string
  projectId?: string
}

export interface ImageAsset {
  id: string
  title: string
  src?: string
  palette: [string, string, string]
  tags: string[]
  projectIds: string[]
  collectionIds: string[]
  origin: 'inspiration' | 'pinterest' | 'upload'
  height: 'short' | 'medium' | 'tall'
  createdAt: string
}

export interface Collection {
  id: string
  name: string
  imageIds: string[]
  accent: string
}

export interface Track {
  id: string
  title: string
  artist: string
  accent: [string, string]
}

export interface AppState {
  version: number
  treeGrowth: number
  tasks: Task[]
  habits: Habit[]
  thoughts: Thought[]
  notes: Note[]
  brainCategories: BrainCategory[]
  projects: Project[]
  people: Person[]
  journalEntries: JournalEntry[]
  healthEntries: HealthEntry[]
  exercises: Exercise[]
  workouts: Workout[]
  healthPlans: DayPlan[]
  wellnessLogs: WellnessLog[]
  skincareRoutine: SkincareRoutine
  skinPhotos: SkinPhoto[]
  focusSessions: FocusSession[]
  imageAssets: ImageAsset[]
  collections: Collection[]
  tracks: Track[]
  currentTrackIndex: number
  isPlaying: boolean
}
