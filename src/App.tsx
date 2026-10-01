import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Compass,
  Download,
  FileText,
  Folder,
  FolderPlus,
  Heart,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Moon,
  Music2,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  SkipBack,
  SkipForward,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import type { CSSProperties, FormEvent } from 'react'
import { BrainMap, BottomNav, MusicPlayer, PeopleCloud, PhoneFrame, StatusBar, VisualArt, type BottomNavAction } from './components/VisualComponents'
import { buildBrainGraph, isSampleGraphNote } from './brainGraph'
import { classifyTasks, localDateKey, selectedDateAfterRollover, taskIsComplete, toggleTaskForDate } from './daily'
import { advanceWorkoutSession, beginWorkoutSession, recordWorkoutSet } from './workoutSession'
import { ExerciseIllustration, searchWorkoutGuideExercises, WorkoutGuideCredits } from './components/ExerciseIllustration'
import { StoredImage } from './components/StoredImage'
import { createDemoState, createPinterestSample } from './data/demoData'
import { createBackup, currentDataSummary, readBackup } from './backup'
import type { BackupSummary } from './backup'
import { useAppStorage, type SaveState } from './hooks/useAppStorage'
import { useOfflineShell, type OfflineShell } from './hooks/useOfflineShell'
import type { BackupVerification } from './storage/indexedDbRepository'
import { useMobileViewport } from './hooks/useMobileViewport'
import type { AppState, BrainCategory, BrainCategoryIcon, DayPlan, Exercise, Habit, ImageAsset, JournalEntry, Note, Person, PlannedExercise, PlannedExercisePhase, PlannedExerciseUnit, Project, Screen, SheetState, SkinPhoto, SkincareRoutine, Tab, Task, Thought, WellnessLog } from './types'
import peoplePortraits from './people-portraits-collage.png'

const modeMinutes: Record<string, number> = {
  '25 / 5': 25,
  '50 / 10': 50,
  '90 deep': 90,
  Custom: 35,
}

const blankPersonDraft = { birthday: '', likes: '', dislikes: '', remember: '', gifts: '', notes: '' }
const blankJournalDraft = { title: '', mood: 3, howWasToday: '', whatHappened: '', whatWasGood: '', onMind: '' }
type TaskDraft = { title: string; projectId: string; dueDate: string; recurrence: 'once' | 'daily' | 'weekdays' }
const wellnessGoals = { waterDl: 40, mealKcal: 2000 }
const brainCategoryColors = ['#c9b6f4', '#efb18f', '#a8d4c9', '#d9c58f', '#9fb8e8', '#d9a8cd']
const brainCategoryIcons: BrainCategoryIcon[] = ['sparkles', 'book', 'image', 'compass']

function activeTabFor(screen: Screen): Tab {
  if (screen === 'brain' || screen === 'projects' || screen === 'health' || screen === 'home') return screen
  return 'home'
}

function splitList(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = Math.max(0, seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function dateFromIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function isoFromDate(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0')).join('-')
}

function shiftIsoDate(iso: string, days: number) {
  const date = dateFromIso(iso)
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}

function weekStartFor(iso: string, offset = 0) {
  const date = dateFromIso(iso)
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + mondayOffset + offset * 7)
  return isoFromDate(date)
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateFromIso(iso))
}

function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(dateFromIso(iso))
}

function displayStoredDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateFromIso(value)) : value
}

function displayCaptureTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function parseSleepHours(value?: string) {
  if (!value) return 0
  const hours = Number(value.match(/(\d+(?:\.\d+)?)\s*h/i)?.[1] ?? 0)
  const minutes = Number(value.match(/(\d+)\s*m/i)?.[1] ?? 0)
  return hours + minutes / 60
}

function formatWeekRange(days: string[]) {
  if (!days.length) return ''
  return `${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateFromIso(days[0]))} — ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateFromIso(days[days.length - 1]))}`
}

function blankDayPlan(date: string): DayPlan {
  return { id: `plan-${date}`, date, title: 'Open day', focus: 'Build your plan', warmupMinutes: 0, exercises: [], notes: '' }
}

function shiftMonthIso(iso: string, months: number) {
  const date = dateFromIso(iso)
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  return isoFromDate(date)
}

function weekOffsetForDate(iso: string, today: string) {
  const current = dateFromIso(weekStartFor(today))
  const target = dateFromIso(weekStartFor(iso))
  return Math.round((target.getTime() - current.getTime()) / (7 * 24 * 60 * 60 * 1000))
}

function App() {
  useMobileViewport()
  const { data, setData, ready, saveState, retrySave, replaceData, stageImage, portableState, backupVerification, recordBackupVerification } = useAppStorage()
  const offlineShell = useOfflineShell()
  const [screen, setScreen] = useState<Screen>('welcome')
  const [selectedProjectId, setSelectedProjectId] = useState('project-os')
  const [selectedPersonId, setSelectedPersonId] = useState('person-anna')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetState>({ kind: null })
  const [toast, setToast] = useState('')
  const [previewScale, setPreviewScale] = useState(1)
  const [today, setToday] = useState(localDateKey)

  const [captureText, setCaptureText] = useState('')
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '' })
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({ title: '', projectId: '', dueDate: localDateKey(), recurrence: 'once' })
  const [projectDraft, setProjectDraft] = useState({ title: '', description: '' })
  const [personDraft, setPersonDraft] = useState(blankPersonDraft)
  const [healthDraft, setHealthDraft] = useState({ energy: 4, sleep: '7h 12m', notes: '' })
  const [healthDraftDate, setHealthDraftDate] = useState(localDateKey)
  const [healthSelectedDate, setHealthSelectedDate] = useState(localDateKey)
  const [workoutDate, setWorkoutDate] = useState<string | null>(null)
  const [journalDraft, setJournalDraft] = useState(blankJournalDraft)
  const [journalMode, setJournalMode] = useState<'daily' | 'free'>('daily')
  const [focusMode, setFocusMode] = useState('25 / 5')
  const [focusSeconds, setFocusSeconds] = useState(8 * 60 + 32)
  const [focusRunning, setFocusRunning] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [workoutExerciseIndex, setWorkoutExerciseIndex] = useState(0)
  const [restSeconds, setRestSeconds] = useState(90)
  const [resting, setResting] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const lastPrimaryScreen = useRef<Tab>('home')

  const selectedProject = data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0]
  const selectedPerson = data.people.find((person) => person.id === selectedPersonId) ?? data.people[0]
  const selectedImage = data.imageAssets.find((asset) => asset.id === selectedImageId)
  const currentTrack = data.tracks[data.currentTrackIndex] ?? data.tracks[0]
  const activeTab = activeTabFor(screen)
  const hideNav = screen === 'welcome' || screen === 'login' || screen === 'backup' || screen === 'workout' || screen === 'people' || screen === 'focus'
  const previousTodayRef = useRef(today)

  useEffect(() => {
    if (previousTodayRef.current !== today) {
      const previousDay = previousTodayRef.current
      setHealthSelectedDate((date) => selectedDateAfterRollover(date, previousDay, today))
      previousTodayRef.current = today
    }
  }, [today])

  useEffect(() => {
    const refresh = () => setToday(localDateKey())
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  const navigate = (nextScreen: Screen) => {
    if (nextScreen === 'home' || nextScreen === 'brain' || nextScreen === 'projects' || nextScreen === 'health') lastPrimaryScreen.current = nextScreen
    setScreen(nextScreen)
    if (nextScreen === 'home') setFocusRunning(false)
  }

  const returnToPrimaryScreen = () => navigate(lastPrimaryScreen.current)

  const openSheet = (kind: NonNullable<SheetState['kind']>, id?: string, categoryId?: string) => setSheet({ kind, id, categoryId })

  const handleTabChange = (tab: Tab) => {
    navigate(tab)
  }

  const saveCapture = (event?: FormEvent) => {
    event?.preventDefault()
    const text = captureText.trim()
    if (!text) return
    const thought: Thought = { id: `thought-${Date.now()}`, text, createdAt: new Date().toISOString(), pinned: false }
    setData((current) => ({ ...current, thoughts: [thought, ...current.thoughts] }))
    setCaptureText('')
    setSheet({ kind: null })
    notify('Added to Brain')
  }

  const categorizeThought = (thoughtId: string, categoryId: string) => {
    const thought = data.thoughts.find((item) => item.id === thoughtId)
    const category = data.brainCategories.find((item) => item.id === categoryId)
    if (!thought || !category) return
    const id = `note-${Date.now()}`
    const note: Note = { id, title: thought.text, body: `Captured ${displayCaptureTime(thought.createdAt)}.`, tags: [category.name.toLowerCase()], relatedNoteIds: [], pinned: false }
    setData((current) => ({
      ...current,
      thoughts: current.thoughts.filter((item) => item.id !== thoughtId),
      notes: [note, ...current.notes],
      brainCategories: current.brainCategories.map((item) => item.id === categoryId ? { ...item, noteIds: Array.from(new Set([...item.noteIds, id])) } : item),
    }))
    notify(`Moved to ${category.name}`)
  }

  const saveBrainCategory = (category: BrainCategory) => {
    setData((current) => {
      const categories = current.brainCategories ?? []
      const exists = categories.some((item) => item.id === category.id)
      return { ...current, brainCategories: exists ? categories.map((item) => item.id === category.id ? category : item) : [category, ...categories] }
    })
    notify('Category updated')
  }

  const toggleTask = (taskId: string) => {
    const now = new Date()
    const date = localDateKey(now)
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? toggleTaskForDate(task, date, now.toISOString()) : task) }))
  }

  const toggleHabit = (habitId: string) => {
    setData((current) => {
      const habit = current.habits.find((item) => item.id === habitId)
      if (!habit) return current
      const nextCompleted = !habit.completed
      const growthDelta = nextCompleted ? habit.growth : -habit.growth
      return {
        ...current,
        treeGrowth: Math.max(0, current.treeGrowth + growthDelta),
        habits: current.habits.map((item) => item.id === habitId ? { ...item, completed: nextCompleted } : item),
        tasks: current.tasks,
      }
    })
  }

  const openNoteEditor = (note?: Note, projectId = '', categoryId = '') => {
    setNoteDraft(note ? { title: note.title, body: note.body } : { title: '', body: '' })
    openSheet('note', note?.id ?? projectId, categoryId || undefined)
  }

  const saveNote = (event: FormEvent) => {
    event.preventDefault()
    if (!noteDraft.title.trim()) return
    const existingId = sheet.id && data.notes.some((note) => note.id === sheet.id) ? sheet.id : undefined
    if (existingId) {
      setData((current) => ({ ...current, notes: current.notes.map((note) => note.id === existingId ? { ...note, title: noteDraft.title.trim(), body: noteDraft.body.trim() } : note) }))
      notify('Note updated')
    } else {
      const projectId = sheet.id && data.projects.some((project) => project.id === sheet.id) ? sheet.id : undefined
      const categoryId = sheet.categoryId && data.brainCategories.some((category) => category.id === sheet.categoryId) ? sheet.categoryId : undefined
      const id = `note-${Date.now()}`
      const note: Note = { id, title: noteDraft.title.trim(), body: noteDraft.body.trim(), projectId, tags: ['new'], relatedNoteIds: [], pinned: false }
      setData((current) => ({
        ...current,
        notes: [note, ...current.notes],
        projects: projectId ? current.projects.map((project) => project.id === projectId ? { ...project, noteIds: [...project.noteIds, id] } : project) : current.projects,
        brainCategories: categoryId ? current.brainCategories.map((category) => category.id === categoryId ? { ...category, noteIds: Array.from(new Set([...category.noteIds, id])) } : category) : current.brainCategories,
      }))
      notify('Note added')
    }
    setSheet({ kind: null })
  }

  const saveTask = (event: FormEvent) => {
    event.preventDefault()
    if (!taskDraft.title.trim()) return
    const existing = sheet.id ? data.tasks.find((task) => task.id === sheet.id) : undefined
    if (existing) {
      const nextProjectId = taskDraft.projectId || undefined
      setData((current) => ({
        ...current,
        tasks: current.tasks.map((task) => task.id === existing.id ? { ...task, title: taskDraft.title.trim(), projectId: nextProjectId, dueDate: taskDraft.dueDate || undefined, recurrence: taskDraft.recurrence } : task),
        projects: current.projects.map((project) => {
          const withoutTask = project.nextTaskIds.filter((taskId) => taskId !== existing.id)
          return project.id === nextProjectId ? { ...project, nextTaskIds: [...withoutTask, existing.id] } : { ...project, nextTaskIds: withoutTask }
        }),
      }))
      notify('Task updated')
    } else {
      const id = `task-${Date.now()}`
      const task: Task = { id, title: taskDraft.title.trim(), completed: false, priority: 'medium', projectId: taskDraft.projectId || undefined, dueDate: taskDraft.dueDate || undefined, recurrence: taskDraft.recurrence, completedOn: [] }
      setData((current) => ({
        ...current,
        tasks: [...current.tasks, task],
        projects: task.projectId ? current.projects.map((project) => project.id === task.projectId ? { ...project, nextTaskIds: [...project.nextTaskIds, id] } : project) : current.projects,
      }))
      notify('Task added')
    }
    setTaskDraft({ title: '', projectId: '', dueDate: localDateKey(), recurrence: 'once' })
    setSheet({ kind: null })
  }

  const openTaskEditor = (task: Task) => {
    setTaskDraft({ title: task.title, projectId: task.projectId ?? '', dueDate: task.dueDate ?? '', recurrence: task.recurrence ?? 'once' })
    openSheet('task', task.id)
  }

  const deleteTask = (id: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
      projects: current.projects.map((project) => ({ ...project, nextTaskIds: project.nextTaskIds.filter((taskId) => taskId !== id) })),
    }))
    setSheet({ kind: null })
    notify('Task removed')
  }

  const saveProject = (event: FormEvent) => {
    event.preventDefault()
    if (!projectDraft.title.trim()) return
    const existing = sheet.id ? data.projects.find((project) => project.id === sheet.id) : undefined
    if (existing) {
      setData((current) => ({ ...current, projects: current.projects.map((project) => project.id === existing.id ? { ...project, title: projectDraft.title.trim(), description: projectDraft.description.trim() || project.description } : project) }))
      setProjectDraft({ title: '', description: '' })
      setSheet({ kind: null })
      notify('Project updated')
      return
    }
    const id = `project-${Date.now()}`
    const palette = ['#c4a9ff', '#f0b78e', '#9ecfca']
    const project: Project = { id, title: projectDraft.title.trim(), description: projectDraft.description.trim() || 'A new thread of work.', status: 'Active', progress: 0, color: palette[data.projects.length % palette.length], nextTaskIds: [], noteIds: [], imageIds: [], activity: ['Project created'] }
    setData((current) => ({ ...current, projects: [...current.projects, project] }))
    setProjectDraft({ title: '', description: '' })
    setSelectedProjectId(id)
    setSheet({ kind: null })
    navigate('project-detail')
    notify('Project created')
  }

  const openPersonEditor = (person: Person) => {
    setPersonDraft({ birthday: person.birthday, likes: person.likes.join(', '), dislikes: person.dislikes.join(', '), remember: person.remember.join(', '), gifts: person.gifts.join(', '), notes: person.notes })
    openSheet('person', person.id)
  }

  const savePerson = (event: FormEvent) => {
    event.preventDefault()
    if (!sheet.id) return
    setData((current) => ({
      ...current,
      people: current.people.map((person) => person.id === sheet.id ? { ...person, birthday: personDraft.birthday, likes: splitList(personDraft.likes), dislikes: splitList(personDraft.dislikes), remember: splitList(personDraft.remember), gifts: splitList(personDraft.gifts), notes: personDraft.notes } : person),
    }))
    setSheet({ kind: null })
    notify('Memory updated')
  }

  const addPersonMemory = () => {
    if (!selectedPerson) return
    openPersonEditor(selectedPerson)
  }

  const saveHealth = (event: FormEvent) => {
    event.preventDefault()
    const entryDate = healthDraftDate
    const existing = data.healthEntries.find((entry) => entry.date === entryDate || (entryDate === '2026-08-25' && entry.date === formatLongDate(entryDate)))
    const entry = { id: existing?.id ?? `health-${Date.now()}`, date: entryDate, updatedAt: new Date().toISOString(), energy: healthDraft.energy, sleep: healthDraft.sleep, workout: existing?.workout ?? 'Rest day', notes: healthDraft.notes }
    setData((current) => ({ ...current, healthEntries: [entry, ...current.healthEntries.filter((item) => item.id !== entry.id)] }))
    setSheet({ kind: null })
    notify('Health log updated')
  }

  const openHealthEditor = (date = today) => {
    const entry = data.healthEntries.find((item) => item.date === date || (date === '2026-08-25' && item.date === formatLongDate(date)))
    setHealthDraftDate(date)
    setHealthDraft({ energy: entry?.energy ?? 3, sleep: entry?.sleep ?? '', notes: entry?.notes ?? '' })
    openSheet('health')
  }

  const saveDayPlan = (plan: DayPlan) => {
    setData((current) => ({
      ...current,
      healthPlans: [plan, ...(current.healthPlans ?? []).filter((item) => item.date !== plan.date)],
    }))
    notify('Day plan updated')
  }

  const addExerciseToPlan = (date: string, workoutGuideId: string, defaults: { sets: number; reps: number; unit: PlannedExerciseUnit }) => {
    const guideExercise = searchWorkoutGuideExercises().find((item) => item.id === workoutGuideId)
    if (!guideExercise) return
    if (data.healthPlans.find((item) => item.date === date)?.session) { notify('This day’s workout is already started'); return }
    setData((current) => {
      const localExercise = current.exercises.find((item) => item.workoutGuideId === workoutGuideId)
      const localExerciseId = localExercise?.id ?? `exercise-guide-${guideExercise.id}`
      const plan = (current.healthPlans ?? []).find((item) => item.date === date) ?? blankDayPlan(date)
      if (plan.exercises.some((item) => item.exerciseId === localExerciseId)) return current
      const newPlannedExercise: PlannedExercise = { id: `planned-${Date.now()}`, exerciseId: localExerciseId, sets: defaults.sets, reps: defaults.reps, unit: defaults.unit, phase: 'main' }
      const nextExercise: Exercise = localExercise ?? {
        id: localExerciseId,
        name: guideExercise.name,
        workoutGuideId: guideExercise.id,
        sets: defaults.sets,
        reps: defaults.reps,
        equipment: guideExercise.equipment,
        description: `Focus on ${guideExercise.primaryMuscle}${guideExercise.secondaryMuscles.length ? ` · also ${guideExercise.secondaryMuscles.slice(0, 2).join(' · ')}` : ''}.`,
      }
      const nextPlan: DayPlan = { ...plan, exercises: [...plan.exercises, newPlannedExercise] }
      return {
        ...current,
        exercises: localExercise ? current.exercises : [...current.exercises, nextExercise],
        healthPlans: [nextPlan, ...(current.healthPlans ?? []).filter((item) => item.date !== date)],
      }
    })
    notify(`${guideExercise.name} added to ${formatShortDate(date)}`)
  }

  const updateWellnessLog = (log: WellnessLog) => {
    setData((current) => ({
      ...current,
      wellnessLogs: [{ ...log, updatedAt: new Date().toISOString() }, ...(current.wellnessLogs ?? []).filter((item) => item.date !== log.date)],
    }))
  }

  const updateSkincareRoutine = (routine: SkincareRoutine) => {
    setData((current) => ({ ...current, skincareRoutine: routine }))
  }

  const saveSkinPhoto = (date: string, file?: File) => {
    if (!file) return
    try {
      const src = stageImage(file)
      setData((current) => {
        const existing = current.wellnessLogs?.find((item) => item.date === date)
        const log: WellnessLog = existing ?? { id: `wellness-${date}`, date, water: 0, meals: 0, skincare: false }
        const photo: SkinPhoto = { id: `skin-photo-${Date.now()}`, date, src, createdAt: new Date().toISOString() }
        return {
          ...current,
          wellnessLogs: [{ ...log, skinPhoto: src, updatedAt: new Date().toISOString() }, ...(current.wellnessLogs ?? []).filter((item) => item.date !== date)],
          skinPhotos: [photo, ...(current.skinPhotos ?? [])],
        }
      })
      notify('Skin photo added')
    } catch { notify('Could not add this photo') }
  }

  const saveJournal = (event: FormEvent) => {
    event.preventDefault()
    const entry: JournalEntry = { id: `journal-${Date.now()}`, date: localDateKey(), createdAt: new Date().toISOString(), mode: journalMode, ...journalDraft }
    setData((current) => ({ ...current, journalEntries: [entry, ...current.journalEntries] }))
    setJournalDraft(blankJournalDraft)
    setSheet({ kind: null })
    notify('Journal entry added')
  }

  const handleUpload = (file?: File) => {
    if (!file) return
    try {
      const asset: ImageAsset = { id: `image-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''), src: stageImage(file), palette: ['#d7d0c3', '#8c8b81', '#272b2a'], tags: ['uploaded'], projectIds: [], collectionIds: [], origin: 'upload', height: 'medium', createdAt: new Date().toISOString() }
      setData((current) => ({ ...current, imageAssets: [asset, ...current.imageAssets] }))
      notify('Added to Inspiration')
    } catch { notify('Could not add this image') }
  }

  const deleteImage = (id: string) => {
    setData((current) => ({
      ...current,
      imageAssets: current.imageAssets.filter((asset) => asset.id !== id),
      projects: current.projects.map((project) => ({ ...project, imageIds: project.imageIds.filter((imageId) => imageId !== id) })),
      collections: current.collections.map((collection) => ({ ...collection, imageIds: collection.imageIds.filter((imageId) => imageId !== id) })),
    }))
    setSelectedImageId(null)
    notify('Image removed')
  }

  const linkImageToProject = (imageId: string, projectId: string) => {
    setData((current) => ({
      ...current,
      imageAssets: current.imageAssets.map((asset) => asset.id === imageId && !asset.projectIds.includes(projectId) ? { ...asset, projectIds: [...asset.projectIds, projectId] } : asset),
      projects: current.projects.map((project) => project.id === projectId && !project.imageIds.includes(imageId) ? { ...project, imageIds: [...project.imageIds, imageId] } : project),
    }))
    notify('Linked to project')
  }

  const linkImageToCollection = (imageId: string, collectionId: string) => {
    setData((current) => ({
      ...current,
      imageAssets: current.imageAssets.map((asset) => asset.id === imageId && !asset.collectionIds.includes(collectionId) ? { ...asset, collectionIds: [...asset.collectionIds, collectionId] } : asset),
      collections: current.collections.map((collection) => collection.id === collectionId && !collection.imageIds.includes(imageId) ? { ...collection, imageIds: [...collection.imageIds, imageId] } : collection),
    }))
    notify('Added to collection')
  }

  const cycleTrack = (direction: 1 | -1) => {
    setData((current) => ({ ...current, currentTrackIndex: (current.currentTrackIndex + direction + current.tracks.length) % current.tracks.length }))
  }

  const startFocus = () => {
    setFocusSeconds(8 * 60 + 32)
    setFocusRunning(true)
    setFocusPaused(false)
    navigate('focus')
  }

  const endFocus = (completed: boolean) => {
    setFocusRunning(false)
    setFocusPaused(false)
    if (completed) {
      setData((current) => ({ ...current, treeGrowth: current.treeGrowth + 5, focusSessions: [{ id: `focus-${Date.now()}`, mode: focusMode, minutes: modeMinutes[focusMode] ?? 25, completedAt: new Date().toISOString(), projectId: 'project-os' }, ...current.focusSessions] }))
      notify('Focus complete · +5 growth')
    }
    navigate('home')
  }

  useEffect(() => {
    if (!focusRunning || focusPaused || focusSeconds <= 0) return
    const timer = window.setInterval(() => setFocusSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [focusRunning, focusPaused, focusSeconds])

  useEffect(() => {
    if (focusRunning && focusSeconds === 0) endFocus(true)
    // This intentionally listens only for the timer reaching zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeconds])

  useEffect(() => {
    if (!resting || restSeconds <= 0) return
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resting, restSeconds])

  useEffect(() => {
    if (resting && restSeconds === 0) setResting(false)
  }, [resting, restSeconds])

  const startWorkout = (date: string) => {
    const plan = data.healthPlans.find((item) => item.date === date)
    if (!plan?.exercises.length) { notify('Build this day’s exercise first'); return }
    const existing = plan.session
    if (existing?.completedAt) { notify('This workout is already complete'); return }
    setWorkoutDate(date)
    setWorkoutExerciseIndex(existing?.activeIndex ?? 0)
    setResting(false)
    if (!existing) setData((current) => ({ ...current, healthPlans: current.healthPlans.map((item) => item.date === date ? beginWorkoutSession(item, new Date().toISOString()) : item) }))
    navigate('workout')
  }

  const completeSet = () => {
    const plan = data.healthPlans.find((item) => item.date === workoutDate)
    const planned = plan?.exercises[workoutExerciseIndex]
    if (!plan?.session || !planned) return
    const currentSets = plan.session.completedSets[planned.id] ?? 0
    if (currentSets >= planned.sets) return
    setData((current) => {
      let advanced = false
      const healthPlans = current.healthPlans.map((item) => {
        if (item.date !== workoutDate) return item
        const next = recordWorkoutSet(item, workoutExerciseIndex)
        advanced = next !== item
        return next
      })
      return advanced ? { ...current, treeGrowth: current.treeGrowth + 2, healthPlans } : current
    })
    if (currentSets + 1 < planned.sets) {
      setRestSeconds(90)
      setResting(true)
    }
  }

  const nextExercise = () => {
    const plan = data.healthPlans.find((item) => item.date === workoutDate)
    if (!plan?.session) return
    const planned = plan.exercises[workoutExerciseIndex]
    if (!planned || (plan.session.completedSets[planned.id] ?? 0) < planned.sets) { notify('Complete the sets to continue'); return }
    if (workoutExerciseIndex < plan.exercises.length - 1) {
      const nextIndex = workoutExerciseIndex + 1
      setData((current) => ({ ...current, healthPlans: current.healthPlans.map((item) => item.date === workoutDate ? advanceWorkoutSession(item, workoutExerciseIndex, new Date().toISOString()) : item) }))
      setWorkoutExerciseIndex(nextIndex)
      setResting(false)
    } else {
      if (plan.exercises.some((exercise) => (plan.session?.completedSets[exercise.id] ?? 0) < exercise.sets)) { notify('Finish each movement before completing this workout'); return }
      const completedAt = new Date().toISOString()
      setData((current) => ({ ...current, healthPlans: current.healthPlans.map((item) => item.date === workoutDate ? advanceWorkoutSession(item, workoutExerciseIndex, completedAt) : item) }))
      navigate('health')
      notify('Workout complete')
    }
  }

  const resetDemo = () => {
    setData(createDemoState())
    setHealthSelectedDate(localDateKey())
    setSelectedProjectId('project-os')
    setSelectedPersonId('person-anna')
    setSelectedImageId(null)
    navigate('home')
    notify('Demo reset queued')
  }

  const restoreBackup = async (restored: AppState) => {
    await replaceData(restored)
    setHealthSelectedDate(localDateKey())
    setSelectedProjectId(restored.projects[0]?.id ?? '')
    setSelectedPersonId(restored.people[0]?.id ?? '')
    setSelectedImageId(null)
  }

  const openThought = (thought: Thought) => openSheet('thought-actions', thought.id)

  const quickActions: BottomNavAction[] = [
    { id: 'health-journal', label: 'Health journal', icon: 'health-journal', onSelect: () => openHealthEditor() },
    { id: 'people', label: 'People', icon: 'people', onSelect: () => navigate('people') },
    { id: 'inspiration', label: 'Inspiration', icon: 'inspiration', onSelect: () => navigate('inspiration') },
    { id: 'journal', label: 'Journal', icon: 'journal', onSelect: () => { setJournalDraft(blankJournalDraft); navigate('journal') } },
    { id: 'focus', label: 'Focus', icon: 'focus', onSelect: startFocus },
    { id: 'collections', label: 'Collections', icon: 'collections', onSelect: () => navigate('collections') },
    { id: 'quick-note', label: 'Quick note', icon: 'quick-note', onSelect: () => openSheet('capture') },
  ]

  const renderScreen = () => {
    switch (screen) {
      case 'welcome': return <WelcomeScreen onContinue={() => navigate('home')} />
      case 'login': return <LoginScreen onBack={() => navigate('welcome')} onLogin={() => navigate('home')} />
      case 'home': return <HomeScreen data={data} today={today} onToggleTask={toggleTask} onEditTask={openTaskEditor} onAddTask={() => { setTaskDraft({ title: '', projectId: '', dueDate: today, recurrence: 'once' }); openSheet('task') }} onOpenBackup={() => navigate('backup')} saveState={saveState} onRetrySave={retrySave} />
      case 'backup': return <BackupScreen data={data} onBack={() => navigate('home')} onRestore={restoreBackup} onPortableState={portableState} saveState={saveState} verification={backupVerification} onRecordVerification={recordBackupVerification} offlineShell={offlineShell} />
      case 'brain': return <BrainScreen data={data} onCapture={() => openSheet('capture')} onNewNote={(categoryId) => openNoteEditor(undefined, '', categoryId)} onOpenNote={openNoteEditor} onThought={openThought} onCategorizeThought={categorizeThought} onSaveCategory={saveBrainCategory} onStageImage={stageImage} />
      case 'projects': return <ProjectsScreen data={data} onOpenProject={(project) => { setSelectedProjectId(project.id); navigate('project-detail') }} onNewProject={() => openSheet('project')} />
      case 'project-detail': return <ProjectDetailScreen data={data} today={today} project={selectedProject} onBack={() => navigate('projects')} onEditProject={() => { setProjectDraft({ title: selectedProject?.title ?? '', description: selectedProject?.description ?? '' }); openSheet('project', selectedProject?.id) }} onToggleTask={toggleTask} onEditTask={openTaskEditor} onDeleteTask={deleteTask} onOpenNote={openNoteEditor} onAddTask={(projectId) => { setTaskDraft({ title: '', projectId, dueDate: today, recurrence: 'once' }); openSheet('task') }} onAddNote={(projectId) => openNoteEditor(undefined, projectId)} onOpenImage={setSelectedImageId} />
      case 'health': return <HealthScreen data={data} today={today} selectedDate={healthSelectedDate} setSelectedDate={setHealthSelectedDate} onStartWorkout={startWorkout} onSaveDayPlan={saveDayPlan} onAddExercise={addExerciseToPlan} onUpdateWellness={updateWellnessLog} onSaveSkinPhoto={saveSkinPhoto} onOpenHealthJournal={openHealthEditor} skincareRoutine={data.skincareRoutine} skinPhotos={data.skinPhotos} onUpdateSkincareRoutine={updateSkincareRoutine} />
      case 'people': return <PeopleScreen people={data.people} onBack={returnToPrimaryScreen} onOpenPerson={(person) => { setSelectedPersonId(person.id); navigate('person-detail') }} />
      case 'person-detail': return <PersonDetailScreen person={selectedPerson} onBack={() => navigate('people')} onEdit={() => openPersonEditor(selectedPerson)} onRemember={addPersonMemory} />
      case 'inspiration': return <InspirationScreen assets={data.imageAssets} onBack={returnToPrimaryScreen} onUpload={() => uploadInputRef.current?.click()} onOpenImage={setSelectedImageId} />
      case 'collections': return <CollectionsScreen data={data} onBack={returnToPrimaryScreen} onOpenImage={setSelectedImageId} />
      case 'journal': return <JournalScreen entries={data.journalEntries} onBack={returnToPrimaryScreen} onNew={() => { setJournalDraft(blankJournalDraft); openSheet('journal') }} />
      case 'focus': return <FocusScreen mode={focusMode} seconds={focusSeconds} running={focusRunning} paused={focusPaused} onModeChange={(mode) => { setFocusMode(mode); setFocusSeconds((modeMinutes[mode] ?? 25) * 60) }} onStart={startFocus} onPause={() => setFocusPaused((paused) => !paused)} onBack={() => { setFocusRunning(false); setFocusPaused(false); returnToPrimaryScreen() }} />
      case 'workout': return <WorkoutScreen data={data} date={workoutDate} exerciseIndex={workoutExerciseIndex} resting={resting} restSeconds={restSeconds} onCompleteSet={completeSet} onNextExercise={nextExercise} onSkipRest={() => setResting(false)} onBack={() => { setResting(false); navigate('health') }} />
      case 'spotify': return <SpotifyScreen data={data} onBack={returnToPrimaryScreen} onToggle={() => setData((current) => ({ ...current, isPlaying: !current.isPlaying }))} onNext={() => cycleTrack(1)} onPrevious={() => cycleTrack(-1)} />
      case 'mail': return <MailScreen onBack={returnToPrimaryScreen} />
      case 'pinterest': return <PinterestScreen onBack={returnToPrimaryScreen} onSave={() => { setData((current) => ({ ...current, imageAssets: [createPinterestSample(), ...current.imageAssets] })); notify('Added to Inspiration') }} />
      default: return null
    }
  }

  const renderViewport = (viewportClass: string, motionId: string, mirror = false) => (
    <div className={viewportClass} aria-hidden={mirror ? true : undefined}>
      <StatusBar light={screen === 'welcome' || screen === 'focus' || screen === 'brain' || screen === 'health' || screen === 'workout'} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div className="screen-layer" key={screen} initial={{ opacity: 0, x: 9 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -9 }} transition={{ duration: 0.24, ease: [0.19, 1, 0.22, 1] }}>
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      {!hideNav && <BottomNav active={activeTab} onChange={handleTabChange} quickActions={quickActions} motionId={motionId} />}
      {saveState.kind === 'error' && <div className="storage-error-banner" role="alert"><span>Changes not saved on this device.</span><button type="button" onClick={retrySave}>Retry</button></div>}
      {sheet.kind && <RenderSheet sheet={sheet} setSheet={setSheet} captureText={captureText} setCaptureText={setCaptureText} saveCapture={saveCapture} noteDraft={noteDraft} setNoteDraft={setNoteDraft} saveNote={saveNote} taskDraft={taskDraft} setTaskDraft={setTaskDraft} saveTask={saveTask} onDeleteTask={deleteTask} projectDraft={projectDraft} setProjectDraft={setProjectDraft} saveProject={saveProject} personDraft={personDraft} setPersonDraft={setPersonDraft} savePerson={savePerson} healthDraft={healthDraft} setHealthDraft={setHealthDraft} saveHealth={saveHealth} journalDraft={journalDraft} setJournalDraft={setJournalDraft} journalMode={journalMode} setJournalMode={setJournalMode} saveJournal={saveJournal} data={data} onConvertThoughtToTask={(thought) => { setTaskDraft({ title: thought.text, projectId: thought.projectId ?? '', dueDate: today, recurrence: 'once' }); openSheet('task') }} onConvertThoughtToNote={(thought) => { setNoteDraft({ title: 'Captured thought', body: thought.text }); openSheet('note') }} onDeleteThought={(id) => { setData((current) => ({ ...current, thoughts: current.thoughts.filter((thought) => thought.id !== id) })); setSheet({ kind: null }); notify('Thought removed') }} onPinThought={(id) => { setData((current) => ({ ...current, thoughts: current.thoughts.map((thought) => thought.id === id ? { ...thought, pinned: !thought.pinned } : thought) })); setSheet({ kind: null }); notify('Thought updated') }} />}
      {selectedImage && <ImageViewer asset={selectedImage} projects={data.projects} collections={data.collections} onClose={() => setSelectedImageId(null)} onDelete={() => deleteImage(selectedImage.id)} onLinkProject={(id) => linkImageToProject(selectedImage.id, id)} onLinkCollection={(id) => linkImageToCollection(selectedImage.id, id)} />}
      {toast && <motion.div className="toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={14} />{toast}</motion.div>}
    </div>
  )

  if (!ready) {
    const loadingScreen = <div className="storage-loading-screen"><LumenMark /><strong>{saveState.kind === 'error' ? 'Could not open device data' : 'Opening Lumen…'}</strong><p>{saveState.kind === 'error' ? `${saveState.error} Do not clear this app’s storage.` : 'Checking your data on this device.'}</p>{saveState.kind === 'error' && <button type="button" onClick={retrySave}>Retry opening data</button>}</div>
    return import.meta.env.PROD ? <div className="deployed-app-root">{loadingScreen}</div> : loadingScreen
  }

  if (import.meta.env.PROD) {
    return (
      <div className="deployed-app-root">
        {renderViewport('phone-app deployed-app-screen', 'deployed')}
        <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={(event) => { handleUpload(event.target.files?.[0]); event.target.value = '' }} />
      </div>
    )
  }

  return (
    <div className="preview-root">
      <div className="preview-heading">
        <div><span className="preview-overline">LOCAL PROTOTYPE</span><h2>Lumen <em>v0.1</em></h2></div>
        <span className="preview-note">capture · organize · act</span>
      </div>
      <div className="preview-stage">
        <div className="phone-holder" style={{ transform: `scale(${previewScale})` }}>
        <PhoneFrame>
          <div className="phone-app">
            <StatusBar light={screen === 'welcome' || screen === 'focus' || screen === 'brain' || screen === 'health' || screen === 'workout'} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div className="screen-layer" key={screen} initial={{ opacity: 0, x: 9 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -9 }} transition={{ duration: 0.24, ease: [0.19, 1, 0.22, 1] }}>
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
            {!hideNav && <BottomNav active={activeTab} onChange={handleTabChange} quickActions={quickActions} motionId="phone" />}
            {saveState.kind === 'error' && <div className="storage-error-banner" role="alert"><span>Changes not saved on this device.</span><button type="button" onClick={retrySave}>Retry</button></div>}
            {sheet.kind && <RenderSheet sheet={sheet} setSheet={setSheet} captureText={captureText} setCaptureText={setCaptureText} saveCapture={saveCapture} noteDraft={noteDraft} setNoteDraft={setNoteDraft} saveNote={saveNote} taskDraft={taskDraft} setTaskDraft={setTaskDraft} saveTask={saveTask} onDeleteTask={deleteTask} projectDraft={projectDraft} setProjectDraft={setProjectDraft} saveProject={saveProject} personDraft={personDraft} setPersonDraft={setPersonDraft} savePerson={savePerson} healthDraft={healthDraft} setHealthDraft={setHealthDraft} saveHealth={saveHealth} journalDraft={journalDraft} setJournalDraft={setJournalDraft} journalMode={journalMode} setJournalMode={setJournalMode} saveJournal={saveJournal} data={data} onConvertThoughtToTask={(thought) => { setTaskDraft({ title: thought.text, projectId: thought.projectId ?? '', dueDate: today, recurrence: 'once' }); openSheet('task') }} onConvertThoughtToNote={(thought) => { setNoteDraft({ title: 'Captured thought', body: thought.text }); openSheet('note') }} onDeleteThought={(id) => { setData((current) => ({ ...current, thoughts: current.thoughts.filter((thought) => thought.id !== id) })); setSheet({ kind: null }); notify('Thought removed') }} onPinThought={(id) => { setData((current) => ({ ...current, thoughts: current.thoughts.map((thought) => thought.id === id ? { ...thought, pinned: !thought.pinned } : thought) })); setSheet({ kind: null }); notify('Thought updated') }} />}
            {selectedImage && <ImageViewer asset={selectedImage} projects={data.projects} collections={data.collections} onClose={() => setSelectedImageId(null)} onDelete={() => deleteImage(selectedImage.id)} onLinkProject={(id) => linkImageToProject(selectedImage.id, id)} onLinkCollection={(id) => linkImageToCollection(selectedImage.id, id)} />}
            {toast && <motion.div className="toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={14} />{toast}</motion.div>}
          </div>
        </PhoneFrame>
        </div>
        <div className="flat-preview-holder" style={{ transform: `scale(${previewScale})` }}>
          {renderViewport('phone-app flat-preview-screen', 'flat', true)}
        </div>
      </div>
      <div className="dev-toolbar">
        <span><span className="dev-dot" /> DEV PREVIEW</span>
        <div className="dev-actions"><button onClick={resetDemo}><RotateCcw size={12} /> Reset Demo Data</button><button className={previewScale === 0.84 ? 'is-selected' : ''} onClick={() => setPreviewScale(0.84)}>84%</button><button className={previewScale === 1 ? 'is-selected' : ''} onClick={() => setPreviewScale(1)}>100%</button></div>
      </div>
      <input ref={uploadInputRef} type="file" accept="image/*" hidden onChange={(event) => { handleUpload(event.target.files?.[0]); event.target.value = '' }} />
    </div>
  )
}

function PageHeader({ eyebrow, title, subtitle, onBack, action }: { eyebrow?: string; title: string; subtitle?: string; onBack?: () => void; action?: React.ReactNode }) {
  return (
    <header className={`page-header ${onBack ? 'has-back' : ''}`}>
      {onBack && <button className="back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={17} /></button>}
      <div className="page-header-copy"><span className="eyebrow">{eyebrow ?? 'PERSONAL OS'}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}

function IconButton({ label, children, onClick, className = '' }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return <button className={`icon-button ${className}`} onClick={onClick} aria-label={label}>{children}</button>
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="section-label"><span>{children}</span>{action}</div>
}

function LumenMark({ compact = false }: { compact?: boolean }) {
  return <span className={`lumen-mark ${compact ? 'is-compact' : ''}`} aria-hidden="true"><i /><i /><i /><i /></span>
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="lumen-start">
      <svg className="lumen-start-art" viewBox="0 0 360 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M60 -20 C-15 70 30 118 89 155" fill="none" stroke="#92b4a4" strokeWidth="2" />
        <g transform="translate(100 162) rotate(-14)">
          <circle r="35" fill="#e9ce9e" /><path d="M-12 4 Q0 20 12 4 M-13 -5 l1 0 M12 -5 l1 0" fill="none" stroke="#353930" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-44 -18 Q-54 0 -44 18 M42 -24 l7 7 M46 -34 l9 6" fill="none" stroke="#53584d" strokeWidth="1.4" strokeLinecap="round" />
        </g>
        <g transform="translate(208 468) rotate(12)">
          <circle r="29" fill="#b9ceb8" /><path d="M-10 4 Q0 17 10 4 M-11 -5 l1 0 M10 -5 l1 0" fill="none" stroke="#353930" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M-37 -18 l-5 9 M-43 -21 l-5 10 M35 11 q9 -13 0 -26" fill="none" stroke="#53584d" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <g transform="translate(17 629) rotate(16)">
          <circle r="61" fill="#bdc9e1" /><path d="M-16 -5 Q-10 -12 -4 -5 M10 -5 Q16 -12 22 -5 M-6 9 Q7 22 20 9" fill="none" stroke="#353930" strokeWidth="2" strokeLinecap="round" />
          <path d="M70 -22 q13 17 6 36 M79 -25 q14 18 7 37" fill="none" stroke="#53584d" strokeWidth="1.3" />
        </g>
        <g transform="translate(321 671) rotate(-12)">
          <ellipse rx="88" ry="111" fill="#efc1ac" /><path d="M-42 -29 Q-33 -42 -24 -29 M4 -29 Q13 -42 22 -29 M-26 -10 Q-6 10 14 -10" fill="none" stroke="#353930" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-98 26 q-5 22 11 40 M-107 31 q-4 25 14 43" fill="none" stroke="#53584d" strokeWidth="1.4" />
        </g>
        <path d="M298 60 l0 13 M292 66 l12 0 M61 441 l0 10 M56 446 l10 0" stroke="#9ca498" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="lumen-start-copy">
        <span className="lumen-start-kicker">Welcome to</span>
        <strong>Lumen</strong>
        <span className="lumen-start-subtitle">A little space for a clearer day.</span>
      </span>
      <button className="lumen-enter-button" type="button" onClick={onContinue}>
        <span>Enter Lumen</span><ArrowUpRight size={17} aria-hidden="true" />
      </button>
    </main>
  )
}

function LoginScreen({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onLogin()
  }

  return (
    <main className="onboarding-page onboarding-login">
      <header className="onboarding-login-header">
        <button className="onboarding-login-back" type="button" aria-label="Back to welcome" onClick={onBack}><ArrowLeft size={15} /></button>
        <span className="onboarding-brand-lockup"><LumenMark compact /><strong>Lumen</strong></span>
        <span className="onboarding-login-version">v0.1</span>
      </header>
      <section className="onboarding-login-content">
        <span className="onboarding-login-eyebrow">WELCOME BACK</span>
        <h1>Make space<br />for what matters.</h1>
        <p>Sign in to return to your personal system.</p>
        <form className="onboarding-login-form" onSubmit={submit}>
          <label className="onboarding-field"><span>Email</span><input type="email" placeholder="you@example.com" autoComplete="off" /></label>
          <label className="onboarding-field"><span>Password</span><input type="password" placeholder="••••••••" autoComplete="off" /></label>
          <button className="onboarding-login-submit" type="submit">Log in <ArrowUpRight size={15} /></button>
        </form>
      </section>
      <p className="onboarding-login-footnote">Demo access · no account required</p>
    </main>
  )
}

function HomeScreen({ data, today, onToggleTask, onEditTask, onAddTask, onOpenBackup, saveState, onRetrySave }: { data: AppState; today: string; onToggleTask: (id: string) => void; onEditTask: (task: Task) => void; onAddTask: () => void; onOpenBackup: () => void; saveState: SaveState; onRetrySave: () => void }) {
  const groups = classifyTasks(data.tasks, today)
  const openTasks = groups.today.filter((task) => !taskIsComplete(task, today))
  const completedTaskItems = groups.doneToday
  const tasks = [...openTasks, ...completedTaskItems]
  const completedTasks = completedTaskItems.length
  const totalTasks = groups.today.length
  const taskCarouselRef = useRef<HTMLDivElement>(null)
  const carouselScrollLeftRef = useRef<number | null>(null)
  const completionTimerRef = useRef<number | undefined>(undefined)
  const [departingTaskId, setDepartingTaskId] = useState<string | null>(null)
  const performance = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const liquidHue = Math.round(performance * 1.2)
  const liquidStyle = {
    '--liquid-hue': liquidHue,
  } as CSSProperties
  const moveTaskCarousel = (direction: number) => {
    const carousel = taskCarouselRef.current
    const firstCard = carousel?.querySelector<HTMLElement>('.home-task-card')
    if (!carousel || !firstCard) return
    carousel.scrollBy({ left: direction * (firstCard.offsetWidth + 10), behavior: 'smooth' })
  }
  useEffect(() => () => {
    if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current)
  }, [])
  useLayoutEffect(() => {
    if (carouselScrollLeftRef.current === null) return
    const carousel = taskCarouselRef.current
    if (carousel) carousel.scrollLeft = carouselScrollLeftRef.current
    if (departingTaskId === null) carouselScrollLeftRef.current = null
  }, [data.tasks, departingTaskId])
  const toggleTaskFromHome = (task: Task) => {
    if (departingTaskId) return
    if (taskIsComplete(task, today)) {
      onToggleTask(task.id)
      return
    }
    carouselScrollLeftRef.current = taskCarouselRef.current?.scrollLeft ?? 0
    setDepartingTaskId(task.id)
    completionTimerRef.current = window.setTimeout(() => {
      onToggleTask(task.id)
      window.requestAnimationFrame(() => {
        const carousel = taskCarouselRef.current
        if (carousel && carouselScrollLeftRef.current !== null) carousel.scrollLeft = carouselScrollLeftRef.current
        carouselScrollLeftRef.current = null
        setDepartingTaskId(null)
      })
    }, 300)
  }
  return (
    <div className="screen-scroll home-screen home-minimal-screen home-theme-preview">
      <div className="minimal-home-top"><span className={`home-save-state is-${saveState.kind}`} role="status">{saveState.kind === 'saved' ? 'Saved on this device' : saveState.kind === 'saving' ? 'Saving…' : 'Not saved'}</span>{saveState.kind === 'error' && <button className="home-save-retry" type="button" onClick={onRetrySave}>Retry</button>}<button className="home-backup-link" type="button" onClick={onOpenBackup}><Download size={14} /> Data & backup</button></div>

      <section className="home-liquid-focus" style={liquidStyle}>
        <div className="home-liquid-heading">
          <div>
            <span className="eyebrow">TODAY'S SIGNAL</span>
            <strong>{performance}%</strong>
          </div>
          <span className="home-liquid-state">{performance >= 70 ? 'GREEN ZONE' : performance >= 40 ? 'IN MOTION' : 'BUILDING'}</span>
        </div>
        <div className="liquid-bowl-stage">
          <div className="liquid-glass-window" role="img" aria-label={`${performance}% of today's tasks complete`}>
            <div className="liquid-field" aria-hidden="true"><span className="liquid-blob liquid-blob-one" /><span className="liquid-blob liquid-blob-two" /><span className="liquid-blob liquid-blob-three" /><span className="liquid-glass-reflection" /></div>
          </div>
          <span className="liquid-bowl-shadow" aria-hidden="true" />
        </div>
        <p className="home-liquid-caption">Every finished task shifts the color forward.</p>
      </section>

      <section className="home-section home-task-section">
        <div className="home-task-heading"><div className="home-task-heading-copy"><SectionLabel>{formatLongDate(today).toUpperCase()} · TASKS</SectionLabel><span className="home-task-summary">{openTasks.length} open · {completedTasks} done</span></div><div className="home-task-controls"><button className="home-task-control" onClick={onAddTask} aria-label="Add task"><Plus size={14} /></button><button className="home-task-control" onClick={() => moveTaskCarousel(-1)} aria-label="Previous task"><ChevronLeft size={14} /></button><button className="home-task-control" onClick={() => moveTaskCarousel(1)} aria-label="Next task"><ChevronRight size={14} /></button></div></div>
        {tasks.length ? <motion.div layoutScroll className={`home-task-carousel ${departingTaskId ? 'is-reordering' : ''}`} ref={taskCarouselRef} aria-label="Today's tasks">
          {tasks.map((task, index) => {
            const complete = taskIsComplete(task, today)
            return <div className="home-task-card-wrap" key={task.id}>
              <motion.button layout="position" transition={{ layout: { duration: 0.86, ease: [0.22, 1, 0.36, 1] } }} className={`home-task-card priority-${task.priority} ${complete ? 'is-complete' : ''} ${departingTaskId === task.id ? 'is-departing' : ''}`} onClick={() => toggleTaskFromHome(task)} aria-pressed={complete}><span className="home-task-card-top"><span className="home-task-index">0{index + 1}</span><span className={`home-task-check ${complete ? 'is-done' : ''}`}>{complete && <Check size={10} />}</span></span><span className="home-task-card-title-block"><strong>{task.title}</strong></span><span className="home-task-card-foot"><span>{complete ? 'DONE' : 'OPEN'}</span></span></motion.button>
              <button type="button" className="home-task-card-edit" onClick={() => onEditTask(task)} aria-label={`Edit ${task.title}`}><Pencil size={13} /></button>
            </div>
          })}
        </motion.div> : <div className="home-task-empty"><Check size={15} /><span>{totalTasks ? 'Everything is complete for today.' : 'Nothing scheduled today.'}</span></div>}
        {groups.overdue.length > 0 && <div className="daily-task-group"><span className="eyebrow">OVERDUE · {groups.overdue.length}</span>{groups.overdue.map((task) => <div className="daily-task-row" key={task.id}><button type="button" onClick={() => onToggleTask(task.id)} aria-label={`Complete ${task.title}`}><Circle size={15} /></button><button type="button" onClick={() => onEditTask(task)}>{task.title}</button><small>{task.dueDate}</small></div>)}</div>}
        {groups.unscheduled.length > 0 && <div className="daily-task-group"><span className="eyebrow">UNSCHEDULED · {groups.unscheduled.length}</span>{groups.unscheduled.map((task) => <div className="daily-task-row" key={task.id}><button type="button" onClick={() => onToggleTask(task.id)} aria-label={`Complete ${task.title}`}><Circle size={15} /></button><button type="button" onClick={() => onEditTask(task)}>{task.title}</button></div>)}</div>}
        {groups.completedElsewhereToday.length > 0 && <div className="daily-task-group is-history"><span className="eyebrow">FINISHED TODAY</span>{groups.completedElsewhereToday.map((task) => <div className="daily-task-row" key={task.id}><button type="button" onClick={() => onToggleTask(task.id)} aria-label={`Undo ${task.title}`}><Check size={15} /></button><button type="button" onClick={() => onEditTask(task)}>{task.title}</button></div>)}</div>}
        {groups.yesterdayDone.length > 0 && <div className="daily-task-group is-history"><span className="eyebrow">YESTERDAY · FINISHED</span>{groups.yesterdayDone.map((task) => <div key={task.id}><Check size={15} /><span>{task.title}</span></div>)}</div>}
      </section>
    </div>
  )
}

function BackupCounts({ summary }: { summary: BackupSummary }) {
  return <div className="backup-counts">
    <span><strong>{summary.counts.notes}</strong> notes</span>
    <span><strong>{summary.counts.journalEntries}</strong> journal entries</span>
    <span><strong>{summary.counts.projects}</strong> projects</span>
    <span><strong>{summary.counts.tasks}</strong> tasks</span>
    <span><strong>{summary.embeddedImages}</strong> embedded images</span>
  </div>
}

function BackupScreen({ data, onBack, onRestore, onPortableState, saveState, verification, onRecordVerification, offlineShell }: { data: AppState; onBack: () => void; onRestore: (restored: AppState) => Promise<void>; onPortableState: (data: AppState) => Promise<AppState>; saveState: SaveState; verification: BackupVerification | null; onRecordVerification: (value: BackupVerification) => Promise<void>; offlineShell: OfflineShell }) {
  const [prepared, setPrepared] = useState<{ file: File; summary: BackupSummary } | null>(null)
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof readBackup>> | null>(null)
  const [replaceSelected, setReplaceSelected] = useState(false)
  const [currentCopySaved, setCurrentCopySaved] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentSummary = currentDataSummary(data)

  useEffect(() => {
    let cancelled = false
    setPrepared(null)
    onPortableState(data).then(createBackup).then(({ fileName, text, summary }) => {
      if (!cancelled) setPrepared({ file: new File([text], fileName, { type: 'application/json' }), summary })
    }).catch((failure: unknown) => {
      if (!cancelled) setError(failure instanceof Error ? failure.message : 'Could not prepare the backup.')
    })
    return () => { cancelled = true }
  }, [data, onPortableState])

  const canShareFile = !!prepared && typeof navigator.share === 'function' &&
    (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [prepared.file] }))

  const shareBackup = async () => {
    if (!prepared || !canShareFile) return
    setError('')
    setMessage('')
    try {
      await navigator.share({ files: [prepared.file], title: 'Lumen data backup' })
      setMessage('Check that the file was saved to Files. Sharing alone does not confirm a backup.')
    } catch (failure) {
      if (failure instanceof DOMException && failure.name === 'AbortError') return
      setError('Could not open the share sheet. Try Download backup instead.')
    }
  }

  const downloadBackup = () => {
    if (!prepared) return
    const url = URL.createObjectURL(prepared.file)
    const link = document.createElement('a')
    link.href = url
    link.download = prepared.file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setError('')
    setMessage('Confirm the downloaded file appears in Files or on your computer before relying on it.')
  }

  const chooseImport = async (file?: File) => {
    setPreview(null)
    setReplaceSelected(false)
    setCurrentCopySaved(false)
    setMessage('')
    setError('')
    if (!file) return
    try {
      const validated = await readBackup(await file.text())
      setPreview(validated)
      try {
        await onRecordVerification({ checkedAt: new Date().toISOString(), archiveCreatedAt: validated.createdAt, checksum: validated.checksum })
      } catch {
        setMessage('This file passed the integrity check, but the verification date could not be saved on this device.')
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not read this backup. Nothing was changed.')
    }
  }

  const restore = async () => {
    if (!preview || !replaceSelected || !currentCopySaved) return
    setRestoring(true)
    try {
      await onRestore(preview.data)
      setPreview(null)
      setReplaceSelected(false)
      setCurrentCopySaved(false)
      setError('')
      setMessage('Backup restored on this device. Open your notes and images to check them.')
    } catch {
      setError('This device could not save the restored data. Nothing was replaced. Free storage and try again.')
    } finally {
      setRestoring(false)
    }
  }

  return <main className="screen-scroll backup-screen">
    <PageHeader title="Data & backup" subtitle="Keep a copy you control." onBack={onBack} />
    <div className="backup-intro">Your data currently lives in this browser on this device. A saved file is your recovery copy; this app has no cloud sync yet.<span className="backup-local-status">{saveState.kind === 'saved' ? 'Saved on this device' : saveState.kind === 'saving' ? 'Saving changes…' : 'Some changes are not saved'}</span></div>

    <section className="backup-panel backup-status-panel" aria-label="Storage settings and status">
      <span className="eyebrow">STORAGE STATUS</span>
      <h2>On this device</h2>
      <div className="backup-status-row"><span>Last successful local save</span><strong>{saveState.savedAt ? new Date(saveState.savedAt).toLocaleString() : 'Not recorded yet'}</strong></div>
      <div className="backup-status-row"><span>Last verified export file</span><strong>{verification ? new Date(verification.checkedAt).toLocaleString() : 'None checked yet'}</strong></div>
      <div className="backup-status-row"><span>Offline app shell</span><strong>{offlineShell.ready ? 'Ready' : offlineShell.online ? 'Not ready · try again online' : 'Unavailable offline'}</strong></div>
      <p>{offlineShell.online ? 'Online now.' : 'Offline now. Notes, tasks, and photos still save on this device.'} A checked file is not proof it was copied off this phone. No off-device backup is confirmed by Lumen.</p>
      {offlineShell.updateAvailable && <button className="backup-secondary" type="button" disabled={saveState.kind !== 'saved'} onClick={offlineShell.applyUpdate}>Update Lumen now</button>}
      {offlineShell.updateAvailable && saveState.kind !== 'saved' && <p>Finish saving your changes before updating.</p>}
    </section>

    <section className="backup-panel">
      <span className="eyebrow">CURRENT DATA</span>
      <h2>Make a copy</h2>
      <BackupCounts summary={currentSummary} />
      <p>The archive contains all app records and the full image data currently stored here. It is not encrypted, so keep it private.</p>
      {canShareFile && <button className="backup-primary" type="button" onClick={shareBackup}><Download size={16} /> Save or share backup</button>}
      <button className={canShareFile ? 'backup-secondary' : 'backup-primary'} type="button" onClick={downloadBackup} disabled={!prepared}><Download size={16} /> {prepared ? 'Download backup file' : 'Preparing backup…'}</button>
    </section>

    <section className="backup-panel backup-restore-panel">
      <span className="eyebrow">RESTORE</span>
      <h2>Use an existing copy</h2>
      <p>Choose a Lumen backup. We will check it and show what is inside before anything changes.</p>
      <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={(event) => { void chooseImport(event.target.files?.[0]); event.target.value = '' }} />
      <button className="backup-secondary" type="button" onClick={() => fileInputRef.current?.click()}>Choose backup file</button>
      {preview && <div className="backup-preview">
        <span className="eyebrow">VALID BACKUP · INTEGRITY CHECK PASSED</span>
        <strong>{new Date(preview.createdAt).toLocaleString()}</strong>
        <BackupCounts summary={preview.summary} />
        <p>Restoring will replace the data currently on this device. It will not merge records.</p>
        <label><input type="radio" name="backup-mode" checked={replaceSelected} onChange={() => setReplaceSelected(true)} /> Replace this device's data</label>
        <label><input type="checkbox" checked={currentCopySaved} onChange={(event) => setCurrentCopySaved(event.target.checked)} /> I have saved a separate copy of my current data</label>
        <button className="backup-danger" type="button" disabled={!replaceSelected || !currentCopySaved || restoring} onClick={() => void restore()}>{restoring ? 'Restoring…' : 'Replace with this backup'}</button>
      </div>}
    </section>
    {error && <p className="backup-feedback is-error" role="alert">{error}</p>}
    {message && <p className="backup-feedback" role="status">{message}</p>}
  </main>
}

function BrainCategoryGlyph({ icon, size = 17 }: { icon: BrainCategoryIcon; size?: number }) {
  if (icon === 'book') return <BookOpen size={size} />
  if (icon === 'image') return <ImageIcon size={size} />
  if (icon === 'compass') return <Compass size={size} />
  return <Sparkles size={size} />
}

type BrainSearchItem = {
  id: string
  label: string
  description: string
  kind: 'note' | 'thought' | 'category'
}

function BrainSearchKindIcon({ kind }: { kind: BrainSearchItem['kind'] }) {
  if (kind === 'thought') return <Sparkles size={15} />
  if (kind === 'category') return <Folder size={15} />
  return <FileText size={15} />
}

function BrainActionSearch({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: BrainSearchItem[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const normalizedQuery = value.toLowerCase().trim()
  const results = items.filter((item) => !normalizedQuery || `${item.label} ${item.description} ${item.kind}`.toLowerCase().includes(normalizedQuery)).slice(0, 7)

  useEffect(() => setActiveIndex(-1), [value])

  const selectResult = (item: BrainSearchItem) => {
    onChange(item.label)
    setActiveIndex(-1)
    setIsFocused(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsFocused(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => current < results.length - 1 ? current + 1 : 0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => current > 0 ? current - 1 : results.length - 1)
    } else if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault()
      selectResult(results[activeIndex])
    }
  }

  const handleBlur = () => {
    window.setTimeout(() => {
      setIsFocused(false)
      setActiveIndex(-1)
    }, 150)
  }

  return (
    <div className={`brain-command-search ${isFocused ? 'is-open' : ''}`}>
      <div className="brain-command-input">
        <Search size={16} aria-hidden="true" />
        <input
          ref={inputRef}
          id="brain-search"
          aria-label="Search brain"
          aria-autocomplete="list"
          aria-controls="brain-search-results"
          aria-activedescendant={activeIndex >= 0 ? `brain-search-result-${results[activeIndex]?.id}` : undefined}
          aria-expanded={isFocused}
          autoComplete="off"
          onBlur={handleBlur}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => { setIsFocused(true); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Search notes, ideas, categories"
          role="combobox"
          type="text"
          value={value}
        />
        <AnimatePresence initial={false} mode="popLayout">
          {value ? <motion.button
            key="clear"
            type="button"
            aria-label="Clear search"
            className="brain-command-clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { onChange(''); setIsFocused(true); inputRef.current?.focus() }}
            initial={{ opacity: 0, scale: .7, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .7, y: -5 }}
            transition={{ duration: .16 }}
          ><X size={13} /></motion.button> : <motion.span key="shortcut" className="brain-command-shortcut" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: .16 }}>⌘K</motion.span>}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isFocused && <motion.div
          id="brain-search-results"
          className="brain-search-results"
          role="listbox"
          aria-label="Brain search results"
          initial={{ opacity: 0, height: 0, y: -5 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -5 }}
          transition={{ duration: .2, ease: [0.22, 1, 0.36, 1] }}
        >
          {results.length ? <>
            <div className="brain-search-results-label">{normalizedQuery ? `${results.length} ${results.length === 1 ? 'match' : 'matches'}` : 'RECENTLY IN YOUR BRAIN'}</div>
            {results.map((item, index) => <motion.button
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              id={`brain-search-result-${item.id}`}
              className={`brain-search-result ${activeIndex === index ? 'is-active' : ''}`}
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectResult(item)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * .025, duration: .18 }}
            >
              <span className={`brain-search-result-icon is-${item.kind}`}><BrainSearchKindIcon kind={item.kind} /></span>
              <span className="brain-search-result-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
              <span className="brain-search-result-kind">{item.kind}</span>
            </motion.button>)}
            <div className="brain-search-results-foot"><span>↑↓ navigate · ↵ select</span><span>ESC close</span></div>
          </> : <div className="brain-search-no-results"><Search size={15} /><span>No notes, ideas, or categories found.</span></div>}
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}

function BrainScreen({ data, onCapture, onNewNote, onOpenNote, onThought, onCategorizeThought, onSaveCategory, onStageImage }: { data: AppState; onCapture: () => void; onNewNote: (categoryId?: string) => void; onOpenNote: (note: Note) => void; onThought: (thought: Thought) => void; onCategorizeThought: (thoughtId: string, categoryId: string) => void; onSaveCategory: (category: BrainCategory) => void; onStageImage: (file: File) => string }) {
  const [categoryDraft, setCategoryDraft] = useState<BrainCategory | null>(null)
  const [activeSection, setActiveSection] = useState('home')
  const [showSampleNotes, setShowSampleNotes] = useState(false)
  const [notePageSize, setNotePageSize] = useState(40)
  const [brainSearchOpen, setBrainSearchOpen] = useState(false)
  const [brainSearch, setBrainSearch] = useState('')
  const brainScreenRef = useRef<HTMLDivElement>(null)
  const categoryImageInputRef = useRef<HTMLInputElement>(null)
  const brainSearchInputRef = useRef<HTMLInputElement>(null)
  const categories = data.brainCategories ?? []
  const searchQuery = brainSearch.trim().toLowerCase()
  const matchesNote = (note: Note) => !searchQuery || `${note.title} ${note.body} ${note.tags.join(' ')}`.toLowerCase().includes(searchQuery)
  const matchesThought = (thought: Thought) => !searchQuery || thought.text.toLowerCase().includes(searchQuery)
  const pinnedNotes = data.notes.filter((note) => note.pinned && matchesNote(note))
  const quickNotes = data.thoughts.filter((thought) => !thought.projectId && matchesThought(thought))
  const activeCategory = categories.find((category) => category.id === activeSection)
  const sampleNoteCount = data.notes.filter(isSampleGraphNote).length
  const allSectionNotes = activeSection === 'all'
    ? data.notes.filter((note) => matchesNote(note) && (!isSampleGraphNote(note) || showSampleNotes || !!searchQuery))
    : activeCategory ? data.notes.filter((note) => activeCategory.noteIds.includes(note.id) && matchesNote(note)) : []
  const activeSectionNotes = allSectionNotes.slice(0, notePageSize)
  const activeSectionTitle = activeSection === 'all' ? 'All notes' : activeCategory?.name ?? 'Home'
  const categoryForNote = (noteId: string) => categories.find((category) => category.noteIds.includes(noteId))
  const graph = useMemo(() => buildBrainGraph(data.notes, brainSearch), [data.notes, brainSearch])
  const categorySelectableNotes = data.notes.filter((note) => !isSampleGraphNote(note) || categoryDraft?.noteIds.includes(note.id))
  const openCategoryEditor = (category: BrainCategory) => {
    if (brainScreenRef.current) brainScreenRef.current.scrollTop = 0
    setCategoryDraft({ ...category })
  }
  const openNewCategory = () => openCategoryEditor({ id: '', name: '', color: brainCategoryColors[0], icon: 'sparkles', noteIds: [] })
  const toggleDraftNote = (noteId: string) => setCategoryDraft((current) => current ? { ...current, noteIds: current.noteIds.includes(noteId) ? current.noteIds.filter((id) => id !== noteId) : [...current.noteIds, noteId] } : current)
  const loadCategoryImage = (file?: File) => {
    if (!file) return
    setCategoryDraft((current) => current ? { ...current, image: onStageImage(file) } : current)
  }
  const saveCategory = (event: FormEvent) => {
    event.preventDefault()
    if (!categoryDraft?.name.trim()) return
    const id = categoryDraft.id || `brain-category-${Date.now()}`
    onSaveCategory({ ...categoryDraft, id, name: categoryDraft.name.trim() })
    setActiveSection(id)
    setCategoryDraft(null)
  }
  const openBrainSearch = () => setBrainSearchOpen(true)
  const closeBrainSearch = () => {
    setBrainSearchOpen(false)
    setBrainSearch('')
  }
  const handleBrainSearchBlur = () => window.setTimeout(closeBrainSearch, 140)

  useEffect(() => {
    if (!brainSearchOpen) return
    const frame = window.requestAnimationFrame(() => brainSearchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [brainSearchOpen])

  useEffect(() => setNotePageSize(40), [activeSection, brainSearch, showSampleNotes])

  return (
    <div className="screen-scroll brain-screen" ref={brainScreenRef}>
      <div className="brain-page-heading" aria-label="Brain page"><span className="eyebrow">PERSONAL OS</span><strong>Brain</strong></div>

      <nav className={`brain-section-nav ${brainSearchOpen ? 'is-search-open' : ''}`} aria-label="Brain sections" role="tablist">
        <AnimatePresence initial={false} mode="popLayout">
          {brainSearchOpen ? <motion.div key="brain-search-field" className="brain-inline-search" layout initial={{ width: 42, opacity: 0 }} animate={{ width: 182, opacity: 1 }} exit={{ width: 42, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
            <Search size={17} aria-hidden="true" />
            <input ref={brainSearchInputRef} aria-label="Search brain" autoComplete="off" placeholder="Search notes" type="search" value={brainSearch} onBlur={handleBrainSearchBlur} onChange={(event) => setBrainSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') closeBrainSearch() }} />
          </motion.div> : <motion.button key="brain-search-toggle" layout type="button" className="brain-section-search-toggle" aria-label="Open brain search" onClick={openBrainSearch} initial={{ width: 42, opacity: 0 }} animate={{ width: 42, opacity: 1 }} exit={{ width: 42, opacity: 0 }} transition={{ duration: .16 }}><Search size={22} /></motion.button>}
        </AnimatePresence>
        <motion.div className="brain-section-tabs" layout transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
          <motion.button layout type="button" role="tab" aria-selected={activeSection === 'home'} className={activeSection === 'home' ? 'is-active' : ''} onClick={() => setActiveSection('home')}>Home</motion.button>
          <motion.button layout type="button" role="tab" aria-selected={activeSection === 'all'} className={activeSection === 'all' ? 'is-active' : ''} onClick={() => setActiveSection('all')}>All notes</motion.button>
          <motion.button layout type="button" role="tab" aria-selected={activeSection === 'quick'} className={activeSection === 'quick' ? 'is-active' : ''} onClick={() => setActiveSection('quick')}>Quick notes</motion.button>
          {categories.map((category) => <motion.button layout type="button" role="tab" aria-selected={activeSection === category.id} className={activeSection === category.id ? 'is-active brain-section-category' : 'brain-section-category'} key={category.id} onClick={() => setActiveSection(category.id)}><i style={{ background: category.color }} />{category.name}</motion.button>)}
          <motion.button layout type="button" className="brain-section-add" aria-label="New category" onClick={openNewCategory}><Plus size={14} /></motion.button>
        </motion.div>
      </nav>

      {activeSection === 'home' && <>
        <section className="brain-graph-section" aria-label="Connected notes map">
          <BrainMap nodes={graph.nodes} links={graph.links} onOpenNode={(id) => {
            const note = data.notes.find((entry) => entry.id === id)
            if (note) onOpenNote(note)
          }} />
        </section>

        <section className="brain-content-section brain-home-pinned">
          <SectionLabel>PINNED NOTES</SectionLabel>
          <div className="brain-pinned-list">
            {pinnedNotes.map((note) => { const category = categoryForNote(note.id); return <motion.button className="brain-pinned-card" style={{ '--brain-accent': category?.color ?? '#9b9b96' } as CSSProperties} key={note.id} onClick={() => onOpenNote(note)} whileTap={{ scale: .985 }}><span className="brain-note-icon"><Pin size={17} fill="currentColor" /></span><span className="brain-note-copy"><small>{category?.name ?? 'Note'}</small><strong>{note.title}</strong><span>{note.body}</span></span><ChevronRight size={15} /></motion.button> })}
            {!pinnedNotes.length && <button className="brain-inline-empty" onClick={() => onNewNote()}><Pin size={15} /><span>Pin a note to keep it close.</span><Plus size={13} /></button>}
          </div>
        </section>
      </>}

      {activeSection === 'quick' && <section className="brain-quick-page">
        <div className="brain-collection-heading"><div><SectionLabel>QUICK NOTES</SectionLabel><h2>Unsorted thoughts</h2><p>Open a thought for more actions, or file it into a category right away.</p></div><button className="text-action" onClick={onCapture}><Plus size={12} /> Capture</button></div>
        <div className="brain-quick-note-list">
          {quickNotes.map((thought, index) => <motion.article className={`brain-quick-note-row brain-quick-note-tone-${index % 3}`} key={thought.id} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }}>
            <button className="brain-quick-note-main" onClick={() => onThought(thought)}><span className="brain-quick-note-icon"><Sparkles size={15} /></span><span><strong>{thought.text}</strong><small>{displayCaptureTime(thought.createdAt)}</small></span><ChevronRight size={14} /></button>
            <label className="brain-quick-categorize"><span>Move to</span><select aria-label={`Categorize ${thought.text}`} defaultValue="" onClick={(event) => event.stopPropagation()} onChange={(event) => { if (event.target.value) onCategorizeThought(thought.id, event.target.value) }}><option value="">Choose category…</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          </motion.article>)}
          {!quickNotes.length && <div className="brain-quick-empty"><Sparkles size={17} /><strong>No uncategorized thoughts</strong><span>Capture something small and decide where it belongs later.</span><button className="dark-button" onClick={onCapture}><Plus size={13} /> Capture thought</button></div>}
        </div>
      </section>}

      {(activeSection === 'all' || activeCategory) && <section className="brain-note-library">
        <div className="brain-collection-heading"><div><SectionLabel>{activeSection === 'all' ? 'ALL NOTES' : 'CATEGORY'}</SectionLabel><h2>{activeSectionTitle}</h2><p>{activeSection === 'all' ? 'Your notes up front; sample graph notes kept separately.' : `Notes filed under ${activeSectionTitle}.`}</p></div><div className="brain-collection-tools"><span className="brain-collection-count"><strong>{allSectionNotes.length}</strong><small>{allSectionNotes.length === 1 ? 'note' : 'notes'}</small></span>{activeCategory && <button className="brain-collection-edit" aria-label={`Edit ${activeCategory.name} category`} onClick={() => openCategoryEditor(activeCategory)}><Pencil size={13} /></button>}</div></div>
        {activeSection === 'all' && sampleNoteCount > 0 && !searchQuery && <button className="brain-sample-toggle" type="button" aria-expanded={showSampleNotes} onClick={() => setShowSampleNotes((visible) => !visible)}>{showSampleNotes ? 'Hide' : 'Show'} {sampleNoteCount} sample graph notes <ChevronDown size={14} /></button>}
        <div className="brain-library-grid">
          {activeSectionNotes.map((note, index) => { const category = categoryForNote(note.id); return <motion.button className="brain-library-card" style={{ '--brain-card-accent': category?.color ?? '#a9a9a3' } as CSSProperties} key={note.id} onClick={() => onOpenNote(note)} whileTap={{ scale: .985 }} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 12) * .025 }}><span className="brain-library-card-top"><span className="brain-library-card-icon"><FileText size={15} /></span><small>{String(index + 1).padStart(2, '0')}</small></span><span className="brain-library-card-copy"><strong>{note.title}</strong><span>{note.body || 'A note waiting for its first line.'}</span></span><span className="brain-library-card-foot"><small>{category?.name ?? 'Unsorted'}</small><ChevronRight size={13} /></span></motion.button> })}
          <button className="brain-library-add-card" onClick={() => onNewNote(activeCategory?.id)}><span><Plus size={22} /></span><strong>New note</strong><small>{activeCategory ? `Add to ${activeCategory.name}` : 'Start a note'}</small></button>
        </div>
        {allSectionNotes.length > activeSectionNotes.length && <button className="brain-library-more" type="button" onClick={() => setNotePageSize((size) => size + 40)}>Show more notes · {allSectionNotes.length - activeSectionNotes.length} remaining</button>}
        {!allSectionNotes.length && <div className="brain-library-empty"><FileText size={17} /><strong>This shelf is empty</strong><span>Create the first note here.</span></div>}
      </section>}

      <AnimatePresence>
        {categoryDraft && <motion.div className="brain-category-layer" role="dialog" aria-modal="true" aria-label={categoryDraft.id ? 'Edit category' : 'New category'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCategoryDraft(null)}>
          <motion.form className="brain-category-editor" onSubmit={saveCategory} onClick={(event) => event.stopPropagation()} initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }} transition={{ type: 'spring', damping: 27, stiffness: 285 }}>
            <div className="brain-category-editor-head"><div><span className="eyebrow">BRAIN LIBRARY</span><h2>{categoryDraft.id ? 'Edit category' : 'New category'}</h2></div><button type="button" aria-label="Close category editor" onClick={() => setCategoryDraft(null)}><X size={16} /></button></div>
            <div className="brain-category-preview" style={{ '--category-color': categoryDraft.color } as CSSProperties}><span>{categoryDraft.image ? <StoredImage src={categoryDraft.image} alt="Category cover preview" /> : <BrainCategoryGlyph icon={categoryDraft.icon} size={26} />}</span><div><small>PREVIEW</small><strong>{categoryDraft.name || 'Category name'}</strong><em>{categoryDraft.noteIds.length} notes selected</em></div></div>
            <label className="brain-category-field"><span>Name</span><input autoFocus value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="e.g. Reading list" /></label>
            <div className="brain-category-option"><span>Color</span><div className="brain-color-options">{brainCategoryColors.map((color) => <button type="button" aria-label={`Use ${color}`} aria-pressed={categoryDraft.color === color} className={categoryDraft.color === color ? 'is-selected' : ''} style={{ background: color }} key={color} onClick={() => setCategoryDraft({ ...categoryDraft, color })}>{categoryDraft.color === color && <Check size={12} />}</button>)}</div></div>
            <div className="brain-category-option"><span>Icon</span><div className="brain-icon-options">{brainCategoryIcons.map((icon) => <button type="button" aria-label={`Use ${icon} icon`} aria-pressed={categoryDraft.icon === icon} className={categoryDraft.icon === icon ? 'is-selected' : ''} key={icon} onClick={() => setCategoryDraft({ ...categoryDraft, icon })}><BrainCategoryGlyph icon={icon} size={17} /></button>)}</div></div>
            <div className="brain-category-option"><span>Cover image</span><div className="brain-cover-actions"><button type="button" onClick={() => categoryImageInputRef.current?.click()}><ImageIcon size={15} /> {categoryDraft.image ? 'Change image' : 'Add image'}</button>{categoryDraft.image && <button type="button" onClick={() => setCategoryDraft({ ...categoryDraft, image: undefined })}>Remove</button>}</div><input ref={categoryImageInputRef} type="file" accept="image/*" hidden onChange={(event) => { loadCategoryImage(event.target.files?.[0]); event.target.value = '' }} /></div>
            <div className="brain-category-option"><span>Add notes</span><div className="brain-note-options">{categorySelectableNotes.map((note) => { const selected = categoryDraft.noteIds.includes(note.id); return <button type="button" className={selected ? 'is-selected' : ''} aria-pressed={selected} key={note.id} onClick={() => toggleDraftNote(note.id)}>{selected ? <Check size={11} /> : <FileText size={11} />}<span>{note.title}</span></button> })}</div></div>
            <button className="dark-button wide brain-category-save" type="submit" disabled={!categoryDraft.name.trim()}><Check size={14} /> Save category</button>
          </motion.form>
        </motion.div>}
      </AnimatePresence>
    </div>
  )
}

function ProjectsScreen({ data, onOpenProject, onNewProject }: { data: AppState; onOpenProject: (project: Project) => void; onNewProject: () => void }) {
  const projectsToShow = data.projects
  const activeCount = projectsToShow.filter((project) => project.status === 'Active').length
  const pausedCount = projectsToShow.filter((project) => project.status === 'Paused').length

  return (
    <div className="screen-scroll projects-screen">
      <div className="projects-page-heading" aria-label="Projects page">
        <span className="eyebrow">PERSONAL OS</span>
        <strong>Projects</strong>
      </div>

      <section className="projects-pulse-strip" aria-label="Project summary">
        <div className="projects-pulse-copy">
          <span className="eyebrow">PROJECT PULSE</span>
          <strong>Keep your threads moving.</strong>
          <p>{activeCount} active {activeCount === 1 ? 'thread' : 'threads'} ready for the next move.</p>
        </div>
        <div className="projects-pulse-stats" aria-label={`${projectsToShow.length} total projects, ${pausedCount} paused`}>
          <span><strong>{projectsToShow.length}</strong><small>threads</small></span>
          <span><strong>{activeCount}</strong><small>active</small></span>
        </div>
      </section>

      <div className="projects-list-heading"><SectionLabel>PROJECTS <span className="section-count">{projectsToShow.length} total</span></SectionLabel></div>
      <div className="project-stack-grid">
        {projectsToShow.map((project, index) => <motion.button className="project-card" style={{ '--project-accent': project.color } as CSSProperties} key={project.id} onClick={() => onOpenProject(project)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
          <ProjectStackCover project={project} />
          <span className="project-stack-card-copy"><strong>{project.title}</strong><span>{project.status} · {project.progress}% complete</span></span>
        </motion.button>)}
        <button className="project-stack-add-card" onClick={onNewProject} aria-label="New project">
          <span className="project-stack-cover project-stack-cover-add" aria-hidden="true">
            <span className="project-stack-layer project-stack-layer-back-one" />
            <span className="project-stack-layer project-stack-layer-back-two" />
            <span className="project-stack-layer project-stack-layer-back-three" />
            <span className="project-stack-layer project-stack-layer-back-four" />
            <span className="project-stack-front"><span className="project-stack-add-front-icon"><Plus size={29} /></span></span>
          </span>
          <span className="project-stack-add-copy"><strong>New project</strong><small>Start a new thread</small></span>
        </button>
        {!projectsToShow.length && <div className="projects-empty-state">No projects yet.</div>}
      </div>
    </div>
  )
}

function ProjectStackCover({ project }: { project: Project }) {
  const variant = project.id === 'project-portfolio' ? 'portfolio' : project.id === 'project-airpods' ? 'airpods' : 'os'
  return <span className={`project-stack-cover project-stack-cover-${variant}`} aria-hidden="true">
    <span className="project-stack-layer project-stack-layer-back-one" />
    <span className="project-stack-layer project-stack-layer-back-two" />
    <span className="project-stack-layer project-stack-layer-back-three" />
    <span className="project-stack-layer project-stack-layer-back-four" />
    <span className="project-stack-front">
    </span>
  </span>
}

function ProjectDetailScreen({ data, today, project, onBack, onEditProject, onToggleTask, onEditTask, onDeleteTask, onOpenNote, onAddTask, onAddNote, onOpenImage }: { data: AppState; today: string; project?: Project; onBack: () => void; onEditProject: () => void; onToggleTask: (id: string) => void; onEditTask: (task: Task) => void; onDeleteTask: (id: string) => void; onOpenNote: (note: Note) => void; onAddTask: (projectId: string) => void; onAddNote: (projectId: string) => void; onOpenImage: (id: string) => void }) {
  if (!project) return <div className="screen-scroll"><PageHeader title="Project not found" onBack={onBack} /></div>
  const projectTasks = data.tasks.filter((task) => project.nextTaskIds.includes(task.id))
  const projectNotes = data.notes.filter((note) => project.noteIds.includes(note.id))
  const projectImages = data.imageAssets.filter((image) => project.imageIds.includes(image.id))
  return (
    <div className="screen-scroll project-detail-screen">
      <PageHeader eyebrow="PROJECT" title={project.title} onBack={onBack} action={<IconButton label="Edit project" onClick={onEditProject}><Pencil size={16} /></IconButton>} />
      <div className="project-detail-hero"><div><span className="status-pill active-status">{project.status}</span><p>{project.description}</p></div><div className="detail-progress"><strong>{project.progress}<small>%</small></strong><span>complete</span></div></div>
      <div className="progress-track large"><i style={{ width: `${project.progress}%`, background: project.color }} /></div>
      <SectionLabel action={<button className="text-action" onClick={() => onAddTask(project.id)}><Plus size={13} /> Task</button>}>NEXT</SectionLabel>
      <div className="detail-task-list">{projectTasks.length ? projectTasks.map((task) => { const complete = taskIsComplete(task, today); return <div className="detail-task" key={task.id}><button className="detail-task-main" onClick={() => onToggleTask(task.id)}><span className={`task-check ${complete ? 'is-done' : ''}`}>{complete && <Check size={12} />}</span><span>{task.title}</span><span className={`priority-dot ${task.priority}`} /></button><IconButton label={`Edit ${task.title}`} onClick={() => onEditTask(task)}><Pencil size={12} /></IconButton><IconButton label={`Delete ${task.title}`} onClick={() => onDeleteTask(task.id)}><Trash2 size={12} /></IconButton></div> }) : <div className="inline-empty">No next moves yet.</div>}</div>
      <SectionLabel action={<button className="text-action" onClick={() => onAddNote(project.id)}><Plus size={13} /> Note</button>}>NOTES</SectionLabel>
      <div className="project-note-list">{projectNotes.length ? projectNotes.map((note) => <button className="project-note" key={note.id} onClick={() => onOpenNote(note)}><FileText size={15} /><span><strong>{note.title}</strong><small>{note.body}</small></span><ChevronRight size={14} /></button>) : <div className="inline-empty">Add a note to this project.</div>}</div>
      <SectionLabel>GALLERY</SectionLabel>
      {projectImages.length ? <div className="project-gallery">{projectImages.map((image) => <VisualArt key={image.id} asset={image} onClick={() => onOpenImage(image.id)} />)}</div> : <button className="gallery-empty" onClick={() => onOpenImage(data.imageAssets[0]?.id ?? '')}><ImageIcon size={18} /><span>Save a visual to this project</span><ArrowUpRight size={14} /></button>}
      <SectionLabel>RECENT ACTIVITY</SectionLabel>
      <div className="activity-list">{project.activity.map((item, index) => <div key={`${item}-${index}`}><span className="activity-dot" /><span>{item}</span><small>{index === 0 ? 'Today' : `Aug ${24 - index}`}</small></div>)}</div>
    </div>
  )
}

type HealthScreenProps = {
  data: AppState
  today: string
  selectedDate: string
  setSelectedDate: (date: string) => void
  onStartWorkout: (date: string) => void
  onSaveDayPlan: (plan: DayPlan) => void
  onAddExercise: (date: string, workoutGuideId: string, defaults: { sets: number; reps: number; unit: PlannedExerciseUnit }) => void
  onUpdateWellness: (log: WellnessLog) => void
  onSaveSkinPhoto: (date: string, file?: File) => void
  onOpenHealthJournal: (date: string) => void
  skincareRoutine: SkincareRoutine
  skinPhotos: SkinPhoto[]
  onUpdateSkincareRoutine: (routine: SkincareRoutine) => void
}

type WellnessFocus = 'water' | 'meals' | 'sleep'

function HealthScreen({ data, today, selectedDate, setSelectedDate, onStartWorkout, onSaveDayPlan, onAddExercise, onUpdateWellness, onSaveSkinPhoto, onOpenHealthJournal, skincareRoutine, skinPhotos, onUpdateSkincareRoutine }: HealthScreenProps) {
  const [view, setView] = useState<'week' | 'library' | 'builder' | 'skincare' | 'wellness'>('week')
  const [wellnessFocus, setWellnessFocus] = useState<WellnessFocus>('water')
  const [weekOffset, setWeekOffset] = useState(() => weekOffsetForDate(selectedDate, today))
  const [monthCursor, setMonthCursor] = useState(today)
  const [monthOpen, setMonthOpen] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderDraft, setBuilderDraft] = useState<DayPlan | null>(null)
  const [previewExerciseId, setPreviewExerciseId] = useState<string | null>(null)
  useEffect(() => { setWeekOffset(weekOffsetForDate(selectedDate, today)) }, [today, selectedDate])

  const weekDays = useMemo(() => {
    const start = weekStartFor(today, weekOffset)
    return Array.from({ length: 7 }, (_, index) => shiftIsoDate(start, index))
  }, [weekOffset, today])
  const catalog = useMemo(() => searchWorkoutGuideExercises(librarySearch), [librarySearch])
  const previewExercise = useMemo(() => previewExerciseId ? searchWorkoutGuideExercises().find((exercise) => exercise.id === previewExerciseId) ?? null : null, [previewExerciseId])
  const monthDays = useMemo(() => {
    const cursor = dateFromIso(monthCursor)
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12)
    const leadingDays = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12).getDate()
    return Array.from({ length: leadingDays + daysInMonth }, (_, index) => index < leadingDays ? null : isoFromDate(new Date(cursor.getFullYear(), cursor.getMonth(), index - leadingDays + 1, 12)))
  }, [monthCursor])
  const plans = data.healthPlans ?? []
  const selectedPlan = plans.find((plan) => plan.date === selectedDate)
  const selectedWellness: WellnessLog = data.wellnessLogs?.find((log) => log.date === selectedDate) ?? { id: `wellness-${selectedDate}`, date: selectedDate, water: 0, meals: 0, skincare: false, waterDl: 0, mealKcal: 0, skincareMorning: false, skincareNight: false }
  const selectedHealthEntry = data.healthEntries.find((entry) => entry.date === selectedDate || (selectedDate === '2026-08-25' && entry.date === formatLongDate(selectedDate)))
  const selectedWaterDl = selectedWellness.waterDl ?? selectedWellness.water * 2.5
  const selectedMealKcal = selectedWellness.mealKcal ?? selectedWellness.meals * 650
  const selectedSleepLabel = selectedHealthEntry?.sleep || '—'
  const selectedSleepHours = parseSleepHours(selectedHealthEntry?.sleep)
  const skincareMorningDone = selectedWellness.skincareMorning ?? selectedWellness.skincare
  const skincareNightDone = selectedWellness.skincareNight ?? selectedWellness.skincare
  const planExercises = selectedPlan?.exercises ?? []
  const heroPlannedExercise = planExercises.find((exercise) => exercise.phase === 'main') ?? planExercises[0]
  const heroExercise = heroPlannedExercise ? data.exercises.find((exercise) => exercise.id === heroPlannedExercise.exerciseId) : undefined

  const openBuilder = () => {
    if (selectedPlan?.session) return
    setBuilderDraft(selectedPlan ? { ...selectedPlan, exercises: selectedPlan.exercises.map((exercise) => ({ ...exercise })) } : blankDayPlan(selectedDate))
    setBuilderOpen(true)
    setView('builder')
  }

  const closeBuilder = () => {
    setBuilderOpen(false)
    setBuilderDraft(null)
    setView('week')
  }

  const saveBuilder = (event: FormEvent) => {
    event.preventDefault()
    if (!builderDraft) return
    onSaveDayPlan({ ...builderDraft, title: builderDraft.title.trim() || 'Open day', focus: builderDraft.focus.trim() || 'Build your plan' })
    closeBuilder()
  }

  const updateDraft = (changes: Partial<DayPlan>) => setBuilderDraft((current) => current ? { ...current, ...changes } : current)
  const updatePlannedExercise = (id: string, changes: Partial<PlannedExercise>) => setBuilderDraft((current) => current ? { ...current, exercises: current.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...changes } : exercise) } : current)
  const removePlannedExercise = (id: string) => setBuilderDraft((current) => current ? { ...current, exercises: current.exercises.filter((exercise) => exercise.id !== id) } : current)

  const moveWeek = (direction: -1 | 1) => {
    const nextOffset = weekOffset + direction
    const nextStart = weekStartFor(today, nextOffset)
    setWeekOffset(nextOffset)
    setSelectedDate(nextStart)
    setMonthCursor(nextStart)
    closeBuilder()
  }

  const openMonth = () => {
    setMonthCursor(selectedDate)
    setMonthOpen(true)
  }

  const selectMonthDate = (date: string) => {
    setSelectedDate(date)
    setWeekOffset(weekOffsetForDate(date, today))
    setMonthOpen(false)
  }

  const adjustWellness = (field: 'waterDl' | 'mealKcal', amount: number) => {
    const currentValue = field === 'waterDl' ? selectedWaterDl : selectedMealKcal
    onUpdateWellness({ ...selectedWellness, [field]: Math.max(0, currentValue + amount) })
  }

  const toggleSkincare = (period: 'morning' | 'night') => {
    const nextMorning = period === 'morning' ? !skincareMorningDone : skincareMorningDone
    const nextNight = period === 'night' ? !skincareNightDone : skincareNightDone
    onUpdateWellness({ ...selectedWellness, skincare: nextMorning && nextNight, skincareMorning: nextMorning, skincareNight: nextNight })
  }

  const dayLabel = selectedDate === today ? 'TODAY' : new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateFromIso(selectedDate)).toUpperCase()
  const dailyTitle = selectedPlan?.title ?? 'Rest day'
  const hasWorkout = planExercises.length > 0
  const scheduledTasks = classifyTasks(data.tasks, selectedDate).today
  const dailyPerformance = scheduledTasks.length ? Math.round((scheduledTasks.filter((task) => taskIsComplete(task, selectedDate)).length / scheduledTasks.length) * 100) : 0
  const healthLiquidStyle = { '--liquid-hue': Math.round(dailyPerformance * 1.2) } as CSSProperties

  const openWellness = (focus: WellnessFocus) => {
    setWellnessFocus(focus)
    setView('wellness')
  }

  const handleWellnessCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, focus: WellnessFocus) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openWellness(focus)
    }
  }

  if (view === 'wellness') {
    return <div className="screen-scroll health-screen health-planner-screen"><WellnessDetailsScreen focus={wellnessFocus} date={selectedDate} wellness={selectedWellness} sleepLabel={selectedSleepLabel} sleepHours={selectedSleepHours} onBack={() => setView('week')} onChangeFocus={setWellnessFocus} onOpenSkincare={() => setView('skincare')} onUpdateWellness={onUpdateWellness} onOpenHealthJournal={() => onOpenHealthJournal(selectedDate)} /></div>
  }

  if (view === 'skincare') {
    return <div className="screen-scroll health-screen health-planner-screen"><SkincareScreen date={selectedDate} log={selectedWellness} routine={skincareRoutine} photos={skinPhotos} onBack={() => setView('week')} onSavePhoto={onSaveSkinPhoto} onUpdateRoutine={onUpdateSkincareRoutine} onToggleRoutine={toggleSkincare} /></div>
  }

  if (view === 'builder') {
    return <div className="screen-scroll health-screen health-planner-screen health-builder-page">{builderDraft ? <HealthBuilderForm data={data} builderDraft={builderDraft} onSubmit={saveBuilder} onBack={closeBuilder} onAddFromLibrary={() => setView('library')} onUpdateDraft={updateDraft} onUpdatePlannedExercise={updatePlannedExercise} onRemovePlannedExercise={removePlannedExercise} /> : null}</div>
  }

  return (
    <div className={`screen-scroll health-screen health-planner-screen ${view === 'week' ? 'health-landing-page' : ''}`}>
      {view === 'week' ? <>
        <div className="health-page-heading" aria-label="Health page">
          <span className="eyebrow">PERSONAL OS</span>
          <strong>Health</strong>
        </div>
        <div className="health-calendar">
          <div className="health-calendar-head"><button aria-label="Previous week" onClick={() => moveWeek(-1)}><ChevronLeft size={17} /></button><div><span>{weekOffset === 0 ? 'THIS WEEK' : weekOffset < 0 ? 'PAST WEEK' : 'UPCOMING WEEK'}</span><strong>{formatWeekRange(weekDays)}</strong><button className="health-month-trigger" onClick={openMonth}><CalendarDaysIcon /> Month</button></div><button aria-label="Next week" onClick={() => moveWeek(1)}><ChevronRight size={17} /></button></div>
          <div className="health-week-strip" aria-label="Choose a day">{weekDays.map((date) => { const plan = plans.find((item) => item.date === date); const dateObject = dateFromIso(date); return <button key={date} className={selectedDate === date ? 'is-selected' : ''} onClick={() => { setSelectedDate(date); closeBuilder() }}><span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObject)}</span><strong>{dateObject.getDate()}</strong><small>{plan?.title ?? 'Open'}</small></button> })}</div>
        </div>

        {monthOpen && <div className="health-month-layer" onClick={() => setMonthOpen(false)}><motion.div className="health-month-panel" role="dialog" aria-modal="true" aria-label="Monthly calendar" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 280 }}><div className="health-month-head"><button aria-label="Previous month" onClick={() => setMonthCursor(shiftMonthIso(monthCursor, -1))}><ChevronLeft size={16} /></button><div><span>MONTH VIEW</span><h2>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(dateFromIso(monthCursor))}</h2></div><button aria-label="Next month" onClick={() => setMonthCursor(shiftMonthIso(monthCursor, 1))}><ChevronRight size={16} /></button><button className="health-month-close" aria-label="Close month view" onClick={() => setMonthOpen(false)}><X size={15} /></button></div><div className="health-month-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="health-month-grid">{monthDays.map((date, index) => date ? <button key={date} className={selectedDate === date ? 'is-selected' : ''} onClick={() => selectMonthDate(date)}><strong>{dateFromIso(date).getDate()}</strong><small>{plans.find((plan) => plan.date === date)?.title ?? ''}</small></button> : <span key={`empty-${index}`} />)}</div></motion.div></div>}

        <div className="health-daily-card">
          <div className="health-daily-topline health-day-picker"><button type="button" aria-label="Previous day" onClick={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}><ChevronLeft size={16} /></button><label><span>{dayLabel}</span><input type="date" aria-label="Exercise date" value={selectedDate} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value) }} /></label>{selectedDate !== today && <button type="button" className="health-day-today" onClick={() => setSelectedDate(today)}>Today</button>}<button type="button" aria-label="Next day" onClick={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}><ChevronRight size={16} /></button></div>
          <div className="health-daily-copy"><h1>{dailyTitle}</h1><p>{selectedPlan?.focus ?? 'A quiet day for recovery.'}</p><div className="health-daily-meta"><span>{selectedPlan?.warmupMinutes ?? 0} min warm-up</span><span>{planExercises.length} {planExercises.length === 1 ? 'movement' : 'movements'}</span></div></div>
          <div className="health-daily-art">{heroExercise ? <ExerciseIllustration exerciseId={heroExercise.workoutGuideId} exerciseName={heroExercise.name} legacyVisual={heroExercise.visual} animated={false} singleFrame showLabel={false} /> : <div className="health-rest-art"><DumbbellIcon /><span>REST / RESET</span></div>}</div>
          <div className="health-daily-actions"><button className="health-daily-gallery" aria-label="Open exercise gallery" onClick={(event) => { event.stopPropagation(); closeBuilder(); setView('library') }}><ImageIcon size={13} /></button><button className="health-daily-edit" aria-label="Edit daily exercise" disabled={!!selectedPlan?.session} onClick={(event) => { event.stopPropagation(); openBuilder() }}><Pencil size={13} /></button><button className="dark-button health-start-button" disabled={!!selectedPlan?.session?.completedAt} onClick={(event) => { event.stopPropagation(); hasWorkout ? onStartWorkout(selectedDate) : openBuilder() }}>{selectedPlan?.session?.completedAt ? <><Check size={13} /> Workout complete</> : hasWorkout ? <><Play size={13} fill="currentColor" /> {selectedPlan?.session ? 'Resume exercise' : 'Start daily exercise'}</> : <><Plus size={13} /> Build daily exercise</>}</button></div>
        </div>

        <SectionLabel>WELLNESS & CARE</SectionLabel>
        <div className="health-wellness-cards">
          <div className="health-wellness-card health-wellness-card-interactive wellness-water-card" role="button" tabIndex={0} aria-label="Open water log" onClick={() => openWellness('water')} onKeyDown={(event) => handleWellnessCardKeyDown(event, 'water')}>
            <div className="health-wellness-card-head"><span className="health-wellness-icon"><DropletsIcon /></span><span className="health-wellness-title">Water</span></div>
            <WellnessMeter value={selectedWaterDl} goal={wellnessGoals.waterDl} unit="dl" accent="#3c9bb7" label="Hydration goal" />
          </div>
          <div className="health-wellness-card health-wellness-card-interactive wellness-meals-card" role="button" tabIndex={0} aria-label="Open meals log" onClick={() => openWellness('meals')} onKeyDown={(event) => handleWellnessCardKeyDown(event, 'meals')}>
            <div className="health-wellness-card-head"><span className="health-wellness-icon"><UtensilsIcon /></span><span className="health-wellness-title">Meals</span></div>
            <WellnessMeter value={selectedMealKcal} goal={wellnessGoals.mealKcal} unit="kcal" accent="#d27b58" label="Nutrition goal" />
          </div>
          <div className={`health-wellness-card health-wellness-card-interactive wellness-skincare-card ${skincareMorningDone && skincareNightDone ? 'is-complete' : ''}`} role="button" tabIndex={0} aria-label="Open skincare journal" onClick={() => setView('skincare')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setView('skincare') } }}>
            <div className="health-wellness-card-main">
              <div className="health-wellness-card-head"><span className="health-wellness-icon">{skincareMorningDone && skincareNightDone ? <Check size={15} /> : <Sparkles size={15} />}</span><span className="health-wellness-title">Skincare</span></div>
            </div>
            <SkincareMeter morningDone={skincareMorningDone} nightDone={skincareNightDone} />
          </div>
          <div className="health-wellness-card health-wellness-card-interactive wellness-sleep-card" role="button" tabIndex={0} aria-label="Open sleep log" onClick={() => openWellness('sleep')} onKeyDown={(event) => handleWellnessCardKeyDown(event, 'sleep')}>
            <div className="health-wellness-card-head"><span className="health-wellness-icon"><Moon size={15} /></span><span className="health-wellness-title">Sleep</span></div>
            <WellnessMeter value={selectedSleepHours} goal={8} unit="h" displayValue={selectedSleepLabel} accent="#657ac0" label="Sleep goal" />
          </div>
        </div>
      </> : <>
        <div className="health-gallery-head"><button aria-label={builderOpen ? 'Back to exercise builder' : 'Back to health'} onClick={() => setView(builderOpen ? 'builder' : 'week')}><ChevronLeft size={16} /></button><div><SectionLabel>EXERCISE GALLERY</SectionLabel><h2>Every movement, in one place.</h2><p>Tap an exercise to preview it, or add it to {formatShortDate(selectedDate)}.</p></div></div>
        <div className="health-library-toolbar"><div className="health-library-search"><Search size={15} /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search exercises" /></div><span className="health-library-count">{catalog.length} shown</span></div>
        <div className="exercise-library-list">{catalog.map((guideExercise) => {
          const localExercise = data.exercises.find((item) => item.workoutGuideId === guideExercise.id)
          const alreadyAdded = selectedPlan?.exercises.some((planned) => planned.exerciseId === localExercise?.id)
          const defaults = guideExercise.exerciseType === 'duration' ? { sets: 3, reps: 30, unit: 'seconds' as PlannedExerciseUnit } : { sets: 3, reps: 10, unit: 'reps' as PlannedExerciseUnit }
          return <article className="exercise-library-row" key={guideExercise.id} role="button" tabIndex={0} aria-label={`Preview ${guideExercise.name}`} onClick={() => setPreviewExerciseId(guideExercise.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPreviewExerciseId(guideExercise.id) } }}><div className="exercise-library-art"><ExerciseIllustration exerciseId={guideExercise.id} animated={false} /></div><div className="exercise-library-copy"><span className="eyebrow">{guideExercise.primaryMuscle} · {guideExercise.equipment}</span><h3>{guideExercise.name}</h3><small>{guideExercise.exerciseType.replace(/_/g, ' ')}</small></div><button className={alreadyAdded ? 'is-added' : ''} onClick={(event) => { event.stopPropagation(); onAddExercise(selectedDate, guideExercise.id, defaults) }}>{alreadyAdded ? <Check size={14} /> : <Plus size={14} />}{alreadyAdded ? 'Added' : 'Add'}</button></article>
        })}</div>
        <WorkoutGuideCredits />
      </>}
      {previewExercise && <div className="exercise-preview-layer" onClick={() => setPreviewExerciseId(null)}><motion.div className="exercise-preview-panel" onClick={(event) => event.stopPropagation()} initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 26, stiffness: 280 }}><div className="exercise-preview-head"><div><span className="eyebrow">EXERCISE PREVIEW</span><h2>{previewExercise.name}</h2></div><button aria-label="Close exercise preview" onClick={() => setPreviewExerciseId(null)}><X size={16} /></button></div><div className="exercise-preview-visual"><ExerciseIllustration exerciseId={previewExercise.id} animated /></div><div className="exercise-preview-meta"><span><small>MUSCLE</small><strong>{previewExercise.primaryMuscle}</strong></span><span><small>EQUIPMENT</small><strong>{previewExercise.equipment}</strong></span><span><small>FORMAT</small><strong>{previewExercise.exerciseType.replace(/_/g, ' ')}</strong></span></div><p className="exercise-preview-description">{previewExercise.isStretch ? 'A stretch or mobility movement.' : 'Follow the motion guide slowly and keep the movement controlled.'}{previewExercise.secondaryMuscles.length ? ` Also works ${previewExercise.secondaryMuscles.slice(0, 2).join(' and ')}.` : ''}</p><button className="dark-button wide exercise-preview-add" onClick={() => { const defaults = previewExercise.exerciseType === 'duration' ? { sets: 3, reps: 30, unit: 'seconds' as PlannedExerciseUnit } : { sets: 3, reps: 10, unit: 'reps' as PlannedExerciseUnit }; onAddExercise(selectedDate, previewExercise.id, defaults); setPreviewExerciseId(null) }}><Plus size={14} /> Add to {formatShortDate(selectedDate)}</button></motion.div></div>}
    </div>
  )
}

type HealthBuilderFormProps = {
  data: AppState
  builderDraft: DayPlan
  onSubmit: (event: FormEvent) => void
  onBack: () => void
  onAddFromLibrary: () => void
  onUpdateDraft: (changes: Partial<DayPlan>) => void
  onUpdatePlannedExercise: (id: string, changes: Partial<PlannedExercise>) => void
  onRemovePlannedExercise: (id: string) => void
}

function HealthBuilderForm({ data, builderDraft, onSubmit, onBack, onAddFromLibrary, onUpdateDraft, onUpdatePlannedExercise, onRemovePlannedExercise }: HealthBuilderFormProps) {
  return (
    <motion.form className="health-builder health-builder-page-form" onSubmit={onSubmit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="health-builder-head"><div><SectionLabel>EXERCISE BUILDER</SectionLabel><h3>{formatLongDate(builderDraft.date)}</h3></div><button type="button" aria-label="Back to health" onClick={onBack}><ChevronLeft size={16} /></button></div>
      <div className="health-builder-fields"><label>Day name<input value={builderDraft.title} onChange={(event) => onUpdateDraft({ title: event.target.value })} placeholder="e.g. Leg day" /></label><label>Focus<input value={builderDraft.focus} onChange={(event) => onUpdateDraft({ focus: event.target.value })} placeholder="e.g. Strength" /></label><label>Warm-up <span>(minutes)</span><input type="number" min="0" max="180" value={builderDraft.warmupMinutes} onChange={(event) => onUpdateDraft({ warmupMinutes: Math.max(0, Number(event.target.value) || 0) })} /></label></div>
      <div className="health-builder-list">
        {builderDraft.exercises.length ? builderDraft.exercises.map((planned) => {
          const exercise = data.exercises.find((item) => item.id === planned.exerciseId)
          return <div className="health-builder-row" key={planned.id}><div className="health-builder-art"><ExerciseIllustration exerciseId={exercise?.workoutGuideId} exerciseName={exercise?.name} legacyVisual={exercise?.visual} animated={false} /></div><div className="health-builder-copy"><strong>{exercise?.name ?? 'Exercise'}</strong><span>{exercise?.equipment ?? 'Bodyweight'} · {planned.phase}</span><div className="health-builder-controls"><label>Sets<input type="number" min="1" max="20" value={planned.sets} onChange={(event) => onUpdatePlannedExercise(planned.id, { sets: Math.max(1, Number(event.target.value) || 1) })} /></label><label>{planned.unit === 'seconds' ? 'Seconds' : 'Reps'}<input type="number" min="1" max="999" value={planned.reps} onChange={(event) => onUpdatePlannedExercise(planned.id, { reps: Math.max(1, Number(event.target.value) || 1) })} /></label><label>Phase<select value={planned.phase} onChange={(event) => onUpdatePlannedExercise(planned.id, { phase: event.target.value as PlannedExercisePhase })}><option value="warmup">Warm-up</option><option value="main">Main</option><option value="cooldown">Cooldown</option></select></label></div></div><button className="health-remove-button" type="button" aria-label={`Remove ${exercise?.name ?? 'exercise'}`} onClick={() => onRemovePlannedExercise(planned.id)}><Trash2 size={14} /></button></div>
        }) : <div className="health-builder-empty"><DumbbellIcon /><strong>No exercises yet</strong><span>Add movements from the library, then tune the dose here.</span></div>}
      </div>
      <button className="health-add-from-library" type="button" onClick={onAddFromLibrary}><Plus size={14} /> Add from exercise library</button>
      <textarea value={builderDraft.notes} onChange={(event) => onUpdateDraft({ notes: event.target.value })} placeholder="Notes for this day (optional)" rows={2} />
      <div className="health-builder-footer"><button className="health-cancel-button" type="button" onClick={onBack}>Cancel</button><button className="dark-button" type="submit"><Check size={14} /> Save day plan</button></div>
    </motion.form>
  )
}

function CalendarDaysIcon() {
  return <span className="health-tab-icon"><span /><span /><span /><span /></span>
}

function WellnessMeter({ value, goal, unit, accent, label, displayValue }: { value: number; goal: number; unit: string; accent: string; label: string; displayValue?: string }) {
  const progress = goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0
  const meterValue = displayValue ?? (Number.isInteger(value) ? String(value) : value.toFixed(1))
  const accessibleValue = displayValue ? meterValue : `${meterValue} ${unit}`
  return <div className="health-wellness-meter" style={{ '--meter-accent': accent } as CSSProperties} role="img" aria-label={`${label}: ${accessibleValue} of ${goal} ${unit}`}>
    <svg viewBox="0 0 120 70" aria-hidden="true">
      <path className="health-wellness-meter-track" d="M 15 58 A 45 45 0 0 1 105 58" pathLength="100" />
      <path className="health-wellness-meter-progress" d="M 15 58 A 45 45 0 0 1 105 58" pathLength="100" style={{ strokeDashoffset: `${100 - progress * 100}` }} />
    </svg>
    <div className="health-wellness-meter-center"><strong>{meterValue}<small>{unit}</small></strong><span>{Math.round(progress * 100)}% of goal</span></div>
  </div>
}

function SkincareMeter({ morningDone, nightDone }: { morningDone: boolean; nightDone: boolean }) {
  const completed = Number(morningDone) + Number(nightDone)
  return <div className="health-wellness-meter health-skincare-meter" role="img" aria-label={`Skincare routines: ${completed} of 2 complete`}>
    <svg viewBox="0 0 120 70" aria-hidden="true">
      <path className="health-wellness-meter-track" d="M 15 58 A 45 45 0 0 1 105 58" />
      <path className={`health-skincare-meter-segment is-morning ${morningDone ? 'is-filled' : ''}`} d="M 15 58 A 45 45 0 0 1 60 13" />
      <path className={`health-skincare-meter-segment is-night ${nightDone ? 'is-filled' : ''}`} d="M 60 13 A 45 45 0 0 1 105 58" />
    </svg>
    <div className="health-wellness-meter-center"><strong>{completed}<small>/ 2</small></strong><span>routines logged</span></div>
  </div>
}

type WellnessDetailsScreenProps = {
  focus: WellnessFocus
  date: string
  wellness: WellnessLog
  sleepLabel: string
  sleepHours: number
  onBack: () => void
  onChangeFocus: (focus: WellnessFocus) => void
  onOpenSkincare: () => void
  onUpdateWellness: (log: WellnessLog) => void
  onOpenHealthJournal: () => void
}

function WellnessDetailsScreen({ focus, date, wellness, sleepLabel, sleepHours, onBack, onChangeFocus, onOpenSkincare, onUpdateWellness, onOpenHealthJournal }: WellnessDetailsScreenProps) {
  const selectedWaterDl = wellness.waterDl ?? wellness.water * 2.5
  const selectedMealKcal = wellness.mealKcal ?? wellness.meals * 650
  const adjust = (field: 'waterDl' | 'mealKcal', amount: number) => {
    const currentValue = field === 'waterDl' ? selectedWaterDl : selectedMealKcal
    onUpdateWellness({ ...wellness, [field]: Math.max(0, currentValue + amount) })
  }

  return (
    <div className="wellness-details-page">
      <div className="wellness-details-head">
        <button type="button" aria-label="Back to health" onClick={onBack}><ChevronLeft size={16} /></button>
        <div><SectionLabel>WELLNESS</SectionLabel><h2>Daily log</h2><p>{formatLongDate(date)} · adjust your check-ins</p></div>
      </div>

      <div className="wellness-detail-tabs" aria-label="Choose a wellness log">
        <button type="button" className={focus === 'water' ? 'is-active' : ''} onClick={() => onChangeFocus('water')}><DropletsIcon /><span>Water</span></button>
        <button type="button" className={focus === 'meals' ? 'is-active' : ''} onClick={() => onChangeFocus('meals')}><UtensilsIcon /><span>Meals</span></button>
        <button type="button" className={focus === 'sleep' ? 'is-active' : ''} onClick={() => onChangeFocus('sleep')}><Moon size={14} /><span>Sleep</span></button>
        <button type="button" onClick={onOpenSkincare}><Sparkles size={14} /><span>Skincare</span></button>
      </div>

      {focus === 'water' && <section className="wellness-detail-panel wellness-detail-water">
        <div className="wellness-detail-copy"><SectionLabel>HYDRATION</SectionLabel><h3>Water</h3><p>Work toward a 4 L daily goal.</p></div>
        <WellnessMeter value={selectedWaterDl} goal={wellnessGoals.waterDl} unit="dl" accent="#3c9bb7" label="Hydration goal" />
        <div className="wellness-detail-controls"><button type="button" aria-label="Remove 1 dl of water" onClick={() => adjust('waterDl', -1)}>−</button><button type="button" aria-label="Add 1 dl of water" onClick={() => adjust('waterDl', 1)}>+</button></div>
      </section>}

      {focus === 'meals' && <section className="wellness-detail-panel wellness-detail-meals">
        <div className="wellness-detail-copy"><SectionLabel>NUTRITION</SectionLabel><h3>Meals</h3><p>Track your intake against a 2,000 kcal goal.</p></div>
        <WellnessMeter value={selectedMealKcal} goal={wellnessGoals.mealKcal} unit="kcal" accent="#d27b58" label="Nutrition goal" />
        <div className="wellness-detail-controls"><button type="button" aria-label="Remove 100 kilocalories" onClick={() => adjust('mealKcal', -100)}>−</button><button type="button" aria-label="Log 100 kilocalories" onClick={() => adjust('mealKcal', 100)}>+</button></div>
      </section>}

      {focus === 'sleep' && <section className="wellness-detail-panel wellness-detail-sleep">
        <div className="wellness-detail-copy"><SectionLabel>RECOVERY</SectionLabel><h3>Sleep</h3><p>Keep an eye on your nightly recovery.</p></div>
        <WellnessMeter value={sleepHours} goal={8} unit="h" displayValue={sleepLabel} accent="#657ac0" label="Sleep goal" />
        <button type="button" className="dark-button wellness-detail-edit" onClick={onOpenHealthJournal}><Pencil size={13} /> Edit sleep check-in</button>
      </section>}
    </div>
  )
}

type SkincareScreenProps = {
  date: string
  log: WellnessLog
  routine: SkincareRoutine
  photos: SkinPhoto[]
  onBack: () => void
  onSavePhoto: (date: string, file?: File) => void
  onUpdateRoutine: (routine: SkincareRoutine) => void
  onToggleRoutine: (period: 'morning' | 'night') => void
}

function SkincareScreen({ date, log, routine, photos, onBack, onSavePhoto, onUpdateRoutine, onToggleRoutine }: SkincareScreenProps) {
  const [editingRoutine, setEditingRoutine] = useState(false)
  const [morningDraft, setMorningDraft] = useState(routine.morning.join(', '))
  const [nightDraft, setNightDraft] = useState(routine.night.join(', '))

  useEffect(() => {
    setMorningDraft(routine.morning.join(', '))
    setNightDraft(routine.night.join(', '))
  }, [routine])

  const legacyPhoto = log.skinPhoto && !photos.some((photo) => photo.src === log.skinPhoto)
    ? [{ id: `legacy-skin-photo-${date}`, date, src: log.skinPhoto, createdAt: `${date}T12:00:00.000Z` }]
    : []
  const displayedPhotos = [...photos, ...legacyPhoto].sort((first, second) => second.createdAt.localeCompare(first.createdAt))
  const morningDone = log.skincareMorning ?? log.skincare
  const nightDone = log.skincareNight ?? log.skincare

  const saveRoutine = (event: FormEvent) => {
    event.preventDefault()
    onUpdateRoutine({ morning: splitList(morningDraft), night: splitList(nightDraft) })
    setEditingRoutine(false)
  }

  return (
    <div className="skincare-page">
      <div className="skincare-page-head">
        <button type="button" aria-label="Back to health" onClick={onBack}><ChevronLeft size={16} /></button>
        <div><SectionLabel>SKINCARE</SectionLabel><h2>Skin journal</h2><p>{formatLongDate(date)} · photos and routine</p></div>
      </div>

      <section className="skincare-routine-card">
        <div className="skincare-routine-head">
          <div><SectionLabel>ROUTINE</SectionLabel><h3>Morning & night</h3></div>
          <button type="button" className="skincare-edit-button" aria-label="Edit skincare routine" onClick={() => setEditingRoutine((current) => !current)}><Pencil size={12} /></button>
        </div>
        {editingRoutine ? <form className="skincare-routine-form" onSubmit={saveRoutine}>
          <label>Morning products<input value={morningDraft} onChange={(event) => setMorningDraft(event.target.value)} placeholder="Cleanser, serum, SPF" /></label>
          <label>Night products<input value={nightDraft} onChange={(event) => setNightDraft(event.target.value)} placeholder="Cleanser, treatment, cream" /></label>
          <div><button type="button" className="skincare-cancel-button" onClick={() => setEditingRoutine(false)}>Cancel</button><button className="dark-button" type="submit">Save routine</button></div>
        </form> : <div className="skincare-routine-columns">
          <div><span className="eyebrow">MORNING</span>{routine.morning.length ? routine.morning.map((product, index) => <span className="skincare-product" key={`morning-${product}-${index}`}>{product}</span>) : <span className="skincare-routine-empty">No products added.</span>}</div>
          <div><span className="eyebrow">NIGHT</span>{routine.night.length ? routine.night.map((product, index) => <span className="skincare-product" key={`night-${product}-${index}`}>{product}</span>) : <span className="skincare-routine-empty">No products added.</span>}</div>
        </div>}
      </section>

      <section className="skincare-daily-card">
        <div className="skincare-section-heading"><SectionLabel>DAILY CHECK-IN</SectionLabel><span>{Number(morningDone) + Number(nightDone)} / 2 logged</span></div>
        <SkincareMeter morningDone={morningDone} nightDone={nightDone} />
        <div className="skincare-daily-toggles">
          <div><button type="button" className={`health-skincare-toggle ${morningDone ? 'is-done' : ''}`} aria-label={`${morningDone ? 'Unmark' : 'Mark'} morning skincare`} aria-pressed={morningDone} onClick={() => onToggleRoutine('morning')}>{morningDone && <Check size={14} strokeWidth={2.5} />}</button><span>AM · Morning</span></div>
          <div><button type="button" className={`health-skincare-toggle ${nightDone ? 'is-done' : ''}`} aria-label={`${nightDone ? 'Unmark' : 'Mark'} night skincare`} aria-pressed={nightDone} onClick={() => onToggleRoutine('night')}>{nightDone && <Check size={14} strokeWidth={2.5} />}</button><span>PM · Night</span></div>
        </div>
      </section>

      <section className="skincare-photo-section">
        <div className="skincare-section-heading"><SectionLabel>PHOTO JOURNAL</SectionLabel><span>{displayedPhotos.length} saved</span></div>
        <label className="skincare-upload-card">
          <input type="file" accept="image/*" onChange={(event) => { onSavePhoto(date, event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
          <span className="skincare-upload-icon"><ImageIcon size={16} /></span>
          <span><strong>Add skin photo</strong><small>Keep a visual record over time</small></span>
          <Plus size={15} />
        </label>
        {displayedPhotos.length ? <div className="skincare-photo-list">{displayedPhotos.map((photo) => <article key={photo.id}><StoredImage src={photo.src} alt={`Skin check-in from ${formatLongDate(photo.date)}`} /><div><strong>{formatLongDate(photo.date)}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(photo.createdAt))}</small></div></article>)}</div> : <div className="skincare-empty">No photos yet. Add one to start the timeline.</div>}
      </section>
    </div>
  )
}

function DumbbellIcon() {
  return <span className="health-dumbbell-icon"><i /><i /><b /></span>
}

function DropletsIcon() {
  return <span className="wellness-icon wellness-drop-icon" aria-hidden="true" />
}

function UtensilsIcon() {
  return <Utensils className="wellness-meal-svg" aria-hidden="true" />
}

function PeopleScreen({ people, onBack, onOpenPerson }: { people: Person[]; onBack: () => void; onOpenPerson: (person: Person) => void }) {
  return (
    <div className="people-screen">
        <header className="close-friends-header">
          <h1 aria-label="Close Friends">
            <span>Close</span>
            <span>Friends</span>
          </h1>
        </header>
      <PeopleCloud people={people} onSelect={onOpenPerson} />
      <button className="people-bottom-switch" aria-label="Back to Lumen" onClick={onBack}><span className="people-switch-portraits"><i style={{ backgroundImage: `url(${peoplePortraits})`, backgroundSize: '400% 400%', backgroundPosition: '0% 0%' }} /><i style={{ backgroundImage: `url(${peoplePortraits})`, backgroundSize: '400% 400%', backgroundPosition: '33.333% 0%' }} /></span><ChevronRight size={13} /></button>
      <span className="people-home-indicator" aria-hidden="true" />
    </div>
  )
}

function PersonDetailScreen({ person, onBack, onEdit, onRemember }: { person?: Person; onBack: () => void; onEdit: () => void; onRemember: () => void }) {
  if (!person) return <div className="screen-scroll"><PageHeader title="Person not found" onBack={onBack} /></div>
  return (
    <div className="screen-scroll person-detail-screen"><PageHeader eyebrow="PERSON" title={person.name} onBack={onBack} action={<IconButton label="Edit profile" onClick={onEdit}><Pencil size={16} /></IconButton>} /><div className="person-hero"><div className="person-avatar" style={{ background: person.color }}>{person.initials}</div><div><span className="eyebrow">{person.name.toUpperCase()}</span><h2>Keep the good details.</h2><p>{person.notes || 'A small memory space for this person.'}</p></div></div><div className="memory-grid"><MemoryBlock title="BIRTHDAY" content={[person.birthday]} /><MemoryBlock title="LIKES" content={person.likes} /><MemoryBlock title="DISLIKES" content={person.dislikes} /><MemoryBlock title="REMEMBER" content={person.remember} /><MemoryBlock title="GIFT IDEAS" content={person.gifts} /></div><button className="remember-button" onClick={onRemember}><Plus size={16} /><span>Remember something</span><ArrowUpRight size={14} /></button><div className="person-notes"><SectionLabel>NOTES</SectionLabel><p>{person.notes || 'Nothing written yet.'}</p></div></div>
  )
}

function MemoryBlock({ title, content }: { title: string; content: string[] }) {
  return <div className="memory-block"><span className="eyebrow">{title}</span>{content.length ? content.map((item) => <strong key={item}>{item}</strong>) : <span className="memory-empty">Nothing yet</span>}</div>
}

function InspirationScreen({ assets, onBack, onUpload, onOpenImage }: { assets: ImageAsset[]; onBack: () => void; onUpload: () => void; onOpenImage: (id: string) => void }) {
  return <div className="screen-scroll inspiration-screen"><PageHeader eyebrow="ARCHIVE" title="Inspiration" subtitle="A curated personal archive." onBack={onBack} action={<IconButton label="Upload image" onClick={onUpload}><Plus size={18} /></IconButton>} /><div className="inspiration-intro"><span><Sparkles size={14} /> capture first</span><small>organize when it feels useful</small></div><div className="masonry-grid">{assets.map((asset) => <VisualArt key={asset.id} asset={asset} onClick={() => onOpenImage(asset.id)} />)}</div></div>
}

function CollectionsScreen({ data, onBack, onOpenImage }: { data: AppState; onBack: () => void; onOpenImage: (id: string) => void }) {
  return <div className="screen-scroll collections-screen"><PageHeader eyebrow="ARCHIVE" title="Collections" subtitle="Moodboards for the things you notice." onBack={onBack} /><div className="collections-grid">{data.collections.map((collection) => <div className="collection-card" key={collection.id}><div className="collection-preview">{collection.imageIds.slice(0, 3).map((imageId) => { const asset = data.imageAssets.find((image) => image.id === imageId); return asset ? <VisualArt key={asset.id} asset={asset} onClick={() => onOpenImage(asset.id)} /> : null })}{!collection.imageIds.length && <span className="collection-empty"><Plus size={16} /></span>}</div><div className="collection-card-foot"><span>{collection.name}</span><small>{collection.imageIds.length} saved</small></div></div>)}</div></div>
}

function JournalScreen({ entries, onBack, onNew }: { entries: JournalEntry[]; onBack: () => void; onNew: () => void }) {
  return <div className="screen-scroll journal-screen"><PageHeader eyebrow="REFLECTION" title="Journal" subtitle="No performance required." onBack={onBack} action={<IconButton label="New journal entry" onClick={onNew}><Plus size={18} /></IconButton>} /><div className="journal-modes"><span className="is-active">Daily</span><span>Free</span></div><div className="journal-list">{entries.map((entry) => <article className="journal-entry" key={entry.id}><div className="journal-entry-top"><span>{displayStoredDate(entry.date)}</span><span>{entry.mode === 'daily' ? 'Daily journal' : 'Free writing'}</span></div><h2>{entry.title}</h2>{entry.mode === 'daily' ? <><p>{entry.howWasToday}</p><div className="journal-entry-meta"><span>Mood {'●'.repeat(entry.mood)}<i>{'●'.repeat(5 - entry.mood)}</i></span><span>{entry.whatWasGood}</span></div></> : <p>{entry.onMind}</p>}</article>)}</div></div>
}

function FocusScreen({ mode, seconds, running, paused, onModeChange, onStart, onPause, onBack }: { mode: string; seconds: number; running: boolean; paused: boolean; onModeChange: (mode: string) => void; onStart: () => void; onPause: () => void; onBack: () => void }) {
  const modes = Object.keys(modeMinutes)
  const shiftMode = (direction: -1 | 1) => {
    const currentIndex = Math.max(0, modes.indexOf(mode))
    const nextIndex = (currentIndex + direction + modes.length) % modes.length
    onModeChange(modes[nextIndex])
  }
  const displaySeconds = running ? seconds : 8 * 60 + 32
  const progress = 40
  const displayLabel = `${Math.floor(displaySeconds / 60)}:${String(displaySeconds % 60).padStart(2, '0')}`

  return <div className="focus-player-screen"><section className="focus-player" aria-label="Morning Calm focus session">
    <div className="focus-player-top"><button className="focus-player-back" onClick={onBack} aria-label="Back to Lumen"><ArrowLeft size={15} /></button><span className="eyebrow">SLEEP SESSION</span><span className="focus-player-spacer" aria-hidden="true" /></div>
    <div className="focus-player-heading"><h1>Morning<br />Calm</h1><p>with Sarah Chen</p></div>
    <div className="focus-orbit" role="img" aria-label={`${displayLabel} remaining`}><span className="focus-orbit-ring focus-orbit-ring-outer" /><span className="focus-orbit-ring focus-orbit-ring-middle" /><span className="focus-orbit-ring focus-orbit-ring-inner" /><span className="focus-orbit-core">{displayLabel}</span></div>
    <div className="focus-player-progress"><div className="focus-progress-track"><i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} /></div><div className="focus-progress-labels"><span>4:00</span><span>10:00</span></div></div>
    <div className="focus-player-controls"><button aria-label="Previous focus session" onClick={() => shiftMode(-1)}><ChevronsLeft size={17} /></button><button className="focus-player-play" aria-label={running && !paused ? 'Pause focus session' : 'Start focus session'} onClick={running ? onPause : onStart}>{running && !paused ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button><button aria-label="Next focus session" onClick={() => shiftMode(1)}><ChevronsRight size={17} /></button></div>
  </section></div>
}

function WorkoutScreen({ data, date, exerciseIndex, resting, restSeconds, onCompleteSet, onNextExercise, onSkipRest, onBack }: { data: AppState; date: string | null; exerciseIndex: number; resting: boolean; restSeconds: number; onCompleteSet: () => void; onNextExercise: () => void; onSkipRest: () => void; onBack: () => void }) {
  const plan = data.healthPlans.find((item) => item.date === date)
  const planned = plan?.exercises[exerciseIndex]
  const exercise = data.exercises.find((item) => item.id === planned?.exerciseId)
  if (!plan || !planned || !exercise) return <div className="workout-screen"><button onClick={onBack}>Back to Health</button></div>
  const completedSets = plan.session?.completedSets[planned.id] ?? 0
  const isLast = exerciseIndex === plan.exercises.length - 1
  return <div className="workout-screen"><div className="workout-top"><span className="eyebrow">{plan.title.toUpperCase()} · {exerciseIndex + 1}/{plan.exercises.length}</span><button onClick={onBack} aria-label="Leave workout; progress is saved"><X size={17} /></button></div><div className="workout-progress"><i style={{ width: `${((exerciseIndex + completedSets / Math.max(1, planned.sets)) / plan.exercises.length) * 100}%` }} /></div><div className="workout-heading"><span className="eyebrow">{formatLongDate(plan.date).toUpperCase()} · EXERCISE</span><h1>{exercise.name}</h1><p className="workout-heading-meta"><strong>{planned.sets} × {planned.reps}</strong><span>{exercise.equipment ?? 'Bodyweight'}</span></p></div><ExerciseIllustration exerciseId={exercise.workoutGuideId} exerciseName={exercise.name} legacyVisual={exercise.visual} /><div className="exercise-instructions"><span className="eyebrow">HOW TO MOVE</span><p>{exercise.description}</p></div>{resting ? <div className="rest-card"><span className="eyebrow">REST</span><strong>{formatTimer(restSeconds)}</strong><p>Let the work settle.</p><button onClick={onSkipRest}>Skip rest</button></div> : <div className="set-panel"><div className="set-panel-top"><span>SET {Math.min(planned.sets, completedSets + 1)} <small>of {planned.sets}</small></span><strong>{planned.reps} {planned.unit}</strong></div><button className="complete-set-button" onClick={onCompleteSet} disabled={completedSets >= planned.sets}>{completedSets >= planned.sets ? <Check size={17} /> : <CheckCircle2 size={17} />} {completedSets >= planned.sets ? 'Sets complete' : 'Complete set'}</button></div>}<div className="workout-bottom"><span>{completedSets}/{planned.sets} sets done</span><button onClick={onNextExercise} disabled={completedSets < planned.sets}>{isLast ? 'Finish workout' : 'Next exercise'} <ChevronRight size={14} /></button></div><WorkoutGuideCredits /></div>
}

function SpotifyScreen({ data, onBack, onToggle, onNext, onPrevious }: { data: AppState; onBack: () => void; onToggle: () => void; onNext: () => void; onPrevious: () => void }) {
  const track = data.tracks[data.currentTrackIndex]
  return <div className="screen-scroll external-screen spotify-screen"><PageHeader eyebrow="EXTERNAL APP" title="Spotify" subtitle="A small window for music." onBack={onBack} /><div className="spotify-album" style={{ '--music-a': track.accent[0], '--music-b': track.accent[1] } as CSSProperties}><span className="album-shape shape-one" /><span className="album-shape shape-two" /><span className="album-label">PERSONAL<br />OS</span></div><div className="spotify-track-copy"><span>NOW PLAYING</span><h2>{track.title}</h2><p>{track.artist}</p></div><div className="spotify-scrubber"><span>1:28</span><div><i /></div><span>3:14</span></div><div className="spotify-controls"><button onClick={onPrevious}><SkipBack size={18} fill="currentColor" /></button><button className="spotify-play" onClick={onToggle}>{data.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button><button onClick={onNext}><SkipForward size={18} fill="currentColor" /></button></div><button className="next-track-row" onClick={onNext}>Up next <strong>{data.tracks[(data.currentTrackIndex + 1) % data.tracks.length].title}</strong><ChevronRight size={14} /></button></div>
}

function MailScreen({ onBack }: { onBack: () => void }) {
  return <div className="screen-scroll external-screen mail-screen"><PageHeader eyebrow="EXTERNAL APP" title="Mail" subtitle="Only the signal, for now." onBack={onBack} /><div className="mail-empty-art"><Mail size={28} /><span>3</span></div><h2>Three things are waiting.</h2><p className="external-copy">Personal OS does not become an inbox. Open Mail when you need the rest.</p><button className="dark-button wide"><ArrowUpRight size={14} /> Open Mail</button><div className="mail-lines"><span /><span /><span /></div></div>
}

function PinterestScreen({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  return <div className="screen-scroll external-screen pinterest-screen"><PageHeader eyebrow="EXTERNAL APP" title="Pinterest" subtitle="Discover out there. Keep what matters here." onBack={onBack} /><div className="pinterest-demo"><div className="pin-visual"><span /><i /><b /></div><div className="pin-copy"><span>DEMO PIN</span><h2>Soft forms / late light</h2><p>A visual found elsewhere, ready to become yours.</p></div></div><button className="save-pin-button" onClick={onSave}><Plus size={16} /> Simulate save to Inspiration</button><div className="flow-note"><span>find</span><ChevronRight size={13} /><span>share</span><ChevronRight size={13} /><strong>Personal OS</strong></div></div>
}

function LegacyRenderSheet({ sheet, setSheet, captureText, setCaptureText, saveCapture, noteDraft, setNoteDraft, saveNote, taskDraft, setTaskDraft, saveTask, onDeleteTask, projectDraft, setProjectDraft, saveProject, personDraft, setPersonDraft, savePerson, healthDraft, setHealthDraft, saveHealth, journalDraft, setJournalDraft, journalMode, setJournalMode, saveJournal, data, onConvertThoughtToTask, onConvertThoughtToNote, onDeleteThought, onPinThought }: { sheet: SheetState; setSheet: (sheet: SheetState) => void; captureText: string; setCaptureText: (value: string) => void; saveCapture: (event?: FormEvent) => void; noteDraft: { title: string; body: string }; setNoteDraft: (value: { title: string; body: string }) => void; saveNote: (event: FormEvent) => void; taskDraft: TaskDraft; setTaskDraft: (value: TaskDraft) => void; saveTask: (event: FormEvent) => void; onDeleteTask: (id: string) => void; projectDraft: { title: string; description: string }; setProjectDraft: (value: { title: string; description: string }) => void; saveProject: (event: FormEvent) => void; personDraft: typeof blankPersonDraft; setPersonDraft: (value: typeof blankPersonDraft) => void; savePerson: (event: FormEvent) => void; healthDraft: { energy: number; sleep: string; notes: string }; setHealthDraft: (value: { energy: number; sleep: string; notes: string }) => void; saveHealth: (event: FormEvent) => void; journalDraft: typeof blankJournalDraft; setJournalDraft: (value: typeof blankJournalDraft) => void; journalMode: 'daily' | 'free'; setJournalMode: (value: 'daily' | 'free') => void; saveJournal: (event: FormEvent) => void; data: AppState; onConvertThoughtToTask: (thought: Thought) => void; onConvertThoughtToNote: (thought: Thought) => void; onDeleteThought: (id: string) => void; onPinThought: (id: string) => void }) {
  const close = () => setSheet({ kind: null })
  const thought = sheet.id ? data.thoughts.find((item) => item.id === sheet.id) : undefined
  let title = 'Quick capture'
  let eyebrow = 'PERSONAL OS'
  if (sheet.kind === 'note') { title = sheet.id && data.notes.some((note) => note.id === sheet.id) ? 'Edit note' : 'New note'; eyebrow = 'BRAIN' }
  if (sheet.kind === 'task') { title = sheet.id && data.tasks.some((task) => task.id === sheet.id) ? 'Edit task' : 'New task'; eyebrow = 'ACTION' }
  if (sheet.kind === 'project') { title = sheet.id && data.projects.some((project) => project.id === sheet.id) ? 'Edit project' : 'New project'; eyebrow = 'PROJECTS' }
  if (sheet.kind === 'person') { title = 'Edit memory'; eyebrow = 'PEOPLE' }
  if (sheet.kind === 'health') { title = 'Health check-in'; eyebrow = 'HEALTH JOURNAL' }
  if (sheet.kind === 'journal') { title = 'New journal entry'; eyebrow = 'REFLECTION' }
  if (sheet.kind === 'thought-actions') { title = 'Captured thought'; eyebrow = 'BRAIN' }
  return <div className="sheet-layer" onClick={close}><motion.div className="bottom-sheet" onClick={(event) => event.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 290 }}><div className="sheet-handle" /><div className="sheet-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><IconButton label="Close" onClick={close}><X size={17} /></IconButton></div>{sheet.kind === 'capture' && <form onSubmit={saveCapture}><textarea autoFocus value={captureText} onChange={(event) => setCaptureText(event.target.value)} placeholder="What's on your mind?" rows={4} /><div className="sheet-footer"><span>It will land in Brain first.</span><button className="dark-button" type="submit"><Sparkles size={14} /> Save thought</button></div></form>}{sheet.kind === 'note' && <form onSubmit={saveNote}><input autoFocus value={noteDraft.title} onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })} placeholder="Note title" /><textarea value={noteDraft.body} onChange={(event) => setNoteDraft({ ...noteDraft, body: event.target.value })} placeholder="Start writing…" rows={5} /><div className="sheet-footer"><span>Permanent memory</span><button className="dark-button" type="submit"><Check size={14} /> Save note</button></div></form>}{sheet.kind === 'task' && <form onSubmit={saveTask}><input autoFocus value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="What needs doing?" /><div className="sheet-option-label">Belongs to</div><div className="choice-row"><button type="button" className={!taskDraft.projectId ? 'is-selected' : ''} onClick={() => setTaskDraft({ ...taskDraft, projectId: '' })}>Loose task</button>{data.projects.map((project) => <button type="button" key={project.id} className={taskDraft.projectId === project.id ? 'is-selected' : ''} onClick={() => setTaskDraft({ ...taskDraft, projectId: project.id })}>{project.title}</button>)}</div><div className="sheet-footer"><span>Keep it simple.</span><button className="dark-button" type="submit"><Check size={14} /> Save task</button></div></form>}{sheet.kind === 'project' && <form onSubmit={saveProject}><input autoFocus value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} placeholder="Project name" /><textarea value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} placeholder="What is this becoming?" rows={3} /><div className="sheet-footer"><span>Start with a thread.</span><button className="dark-button" type="submit"><FolderPlus size={14} /> Create project</button></div></form>}{sheet.kind === 'thought-actions' && thought && <div className="thought-action-sheet"><div className="selected-thought"><span className="thought-mark" /><p>{thought.text}</p></div><button onClick={() => onConvertThoughtToTask(thought)}><CheckCircle2 size={16} /><span>Turn into a task</span><ChevronRight size={14} /></button><button onClick={() => onConvertThoughtToNote(thought)}><FileText size={16} /><span>Turn into a note</span><ChevronRight size={14} /></button><button onClick={() => onPinThought(thought.id)}><Pin size={16} /><span>{thought.pinned ? 'Unpin thought' : 'Pin thought'}</span><ChevronRight size={14} /></button><button className="danger-row" onClick={() => onDeleteThought(thought.id)}><Trash2 size={16} /><span>Delete thought</span><ChevronRight size={14} /></button></div>}{sheet.kind === 'person' && <form onSubmit={savePerson} className="person-form"><input value={personDraft.birthday} onChange={(event) => setPersonDraft({ ...personDraft, birthday: event.target.value })} placeholder="Birthday" /><input value={personDraft.likes} onChange={(event) => setPersonDraft({ ...personDraft, likes: event.target.value })} placeholder="Likes · separate with commas" /><input value={personDraft.dislikes} onChange={(event) => setPersonDraft({ ...personDraft, dislikes: event.target.value })} placeholder="Dislikes" /><textarea value={personDraft.remember} onChange={(event) => setPersonDraft({ ...personDraft, remember: event.target.value })} placeholder="Things to remember" rows={3} /><input value={personDraft.gifts} onChange={(event) => setPersonDraft({ ...personDraft, gifts: event.target.value })} placeholder="Gift ideas" /><textarea value={personDraft.notes} onChange={(event) => setPersonDraft({ ...personDraft, notes: event.target.value })} placeholder="Notes" rows={2} /><button className="dark-button wide" type="submit"><Check size={14} /> Save memory</button></form>}{sheet.kind === 'health' && <form onSubmit={saveHealth}><div className="sheet-option-label">Energy today</div><div className="energy-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={healthDraft.energy === value ? 'is-selected' : ''} onClick={() => setHealthDraft({ ...healthDraft, energy: value })}>{value}</button>)}</div><input value={healthDraft.sleep} onChange={(event) => setHealthDraft({ ...healthDraft, sleep: event.target.value })} placeholder="Sleep · e.g. 7h 12m" /><textarea value={healthDraft.notes} onChange={(event) => setHealthDraft({ ...healthDraft, notes: event.target.value })} placeholder="How does your body feel?" rows={3} /><button className="dark-button wide" type="submit"><Check size={14} /> Save check-in</button></form>}{sheet.kind === 'journal' && <form onSubmit={saveJournal}><div className="choice-row journal-choice"><button type="button" className={journalMode === 'daily' ? 'is-selected' : ''} onClick={() => setJournalMode('daily')}>Daily</button><button type="button" className={journalMode === 'free' ? 'is-selected' : ''} onClick={() => setJournalMode('free')}>Free writing</button></div><input autoFocus value={journalDraft.title} onChange={(event) => setJournalDraft({ ...journalDraft, title: event.target.value })} placeholder="Title" />{journalMode === 'daily' ? <><div className="sheet-option-label">Mood</div><div className="energy-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={journalDraft.mood === value ? 'is-selected' : ''} onClick={() => setJournalDraft({ ...journalDraft, mood: value })}>{value}</button>)}</div><textarea value={journalDraft.howWasToday} onChange={(event) => setJournalDraft({ ...journalDraft, howWasToday: event.target.value })} placeholder="How was today?" rows={2} /><textarea value={journalDraft.whatWasGood} onChange={(event) => setJournalDraft({ ...journalDraft, whatWasGood: event.target.value })} placeholder="What was good?" rows={2} /><textarea value={journalDraft.onMind} onChange={(event) => setJournalDraft({ ...journalDraft, onMind: event.target.value })} placeholder="What's on your mind?" rows={2} /></> : <textarea value={journalDraft.onMind} onChange={(event) => setJournalDraft({ ...journalDraft, onMind: event.target.value })} placeholder="Write without organizing it." rows={8} />}<button className="dark-button wide" type="submit"><BookOpen size={14} /> Save entry</button></form>}</motion.div></div>
}

type RenderSheetProps = {
  sheet: SheetState
  setSheet: (sheet: SheetState) => void
  captureText: string
  setCaptureText: (value: string) => void
  saveCapture: (event?: FormEvent) => void
  noteDraft: { title: string; body: string }
  setNoteDraft: (value: { title: string; body: string }) => void
  saveNote: (event: FormEvent) => void
  taskDraft: TaskDraft
  setTaskDraft: (value: TaskDraft) => void
  saveTask: (event: FormEvent) => void
  onDeleteTask: (id: string) => void
  projectDraft: { title: string; description: string }
  setProjectDraft: (value: { title: string; description: string }) => void
  saveProject: (event: FormEvent) => void
  personDraft: typeof blankPersonDraft
  setPersonDraft: (value: typeof blankPersonDraft) => void
  savePerson: (event: FormEvent) => void
  healthDraft: { energy: number; sleep: string; notes: string }
  setHealthDraft: (value: { energy: number; sleep: string; notes: string }) => void
  saveHealth: (event: FormEvent) => void
  journalDraft: typeof blankJournalDraft
  setJournalDraft: (value: typeof blankJournalDraft) => void
  journalMode: 'daily' | 'free'
  setJournalMode: (value: 'daily' | 'free') => void
  saveJournal: (event: FormEvent) => void
  data: AppState
  onConvertThoughtToTask: (thought: Thought) => void
  onConvertThoughtToNote: (thought: Thought) => void
  onDeleteThought: (id: string) => void
  onPinThought: (id: string) => void
}

function SheetFrame({ eyebrow, title, onClose, centered = false, children }: { eyebrow: string; title: string; onClose: () => void; centered?: boolean; children: React.ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeRef.current(); return }
      if (event.key !== 'Tab' || !import.meta.env.PROD) return
      const controls = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? [])
        .filter((control) => control.getClientRects().length > 0)
      if (!controls.length) { event.preventDefault(); return }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !sheetRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  const enterAnimation = centered ? { opacity: 0, scale: .94, y: 12 } : { y: '100%' as const }
  const showAnimation = centered ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }
  const exitAnimation = centered ? { opacity: 0, scale: .96, y: 8 } : { y: '100%' as const }
  return <div className={`sheet-layer${centered ? ' quick-capture-layer' : ''}`} onClick={onClose}><motion.div ref={sheetRef} role="dialog" aria-modal="true" aria-label={title} className={`bottom-sheet${centered ? ' quick-capture-sheet' : ''}`} onClick={(event) => event.stopPropagation()} initial={enterAnimation} animate={showAnimation} exit={exitAnimation} transition={centered ? { type: 'spring', damping: 26, stiffness: 300 } : { type: 'spring', damping: 28, stiffness: 290 }}><div className="sheet-handle" /><div className="sheet-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><IconButton label="Close" onClick={onClose}><X size={17} /></IconButton></div>{children}</motion.div></div>
}

function RenderSheet({ sheet, setSheet, captureText, setCaptureText, saveCapture, noteDraft, setNoteDraft, saveNote, taskDraft, setTaskDraft, saveTask, onDeleteTask, projectDraft, setProjectDraft, saveProject, personDraft, setPersonDraft, savePerson, healthDraft, setHealthDraft, saveHealth, journalDraft, setJournalDraft, journalMode, setJournalMode, saveJournal, data, onConvertThoughtToTask, onConvertThoughtToNote, onDeleteThought, onPinThought }: RenderSheetProps) {
  const close = () => setSheet({ kind: null })
  const thought = sheet.id ? data.thoughts.find((item) => item.id === sheet.id) : undefined
  const editingNote = sheet.kind === 'note' && !!sheet.id && data.notes.some((note) => note.id === sheet.id)
  const editingTask = sheet.kind === 'task' && !!sheet.id && data.tasks.some((task) => task.id === sheet.id)
  const editingProject = sheet.kind === 'project' && !!sheet.id && data.projects.some((project) => project.id === sheet.id)
  const title = sheet.kind === 'capture' ? 'Quick capture' : sheet.kind === 'note' ? (editingNote ? 'Edit note' : 'New note') : sheet.kind === 'task' ? (editingTask ? 'Edit task' : 'New task') : sheet.kind === 'project' ? (editingProject ? 'Edit project' : 'New project') : sheet.kind === 'person' ? 'Edit memory' : sheet.kind === 'health' ? 'Health check-in' : sheet.kind === 'journal' ? 'New journal entry' : 'Captured thought'
  const eyebrow = sheet.kind === 'capture' ? 'PERSONAL OS' : sheet.kind === 'note' || sheet.kind === 'thought-actions' ? 'BRAIN' : sheet.kind === 'task' ? 'ACTION' : sheet.kind === 'project' ? 'PROJECTS' : sheet.kind === 'person' ? 'PEOPLE' : sheet.kind === 'health' ? 'HEALTH JOURNAL' : 'REFLECTION'

  return <SheetFrame eyebrow={eyebrow} title={title} onClose={close} centered={sheet.kind === 'capture'}>
    {sheet.kind === 'capture' && <form onSubmit={saveCapture}><textarea autoFocus value={captureText} onChange={(event) => setCaptureText(event.target.value)} placeholder="What's on your mind?" rows={4} /><div className="sheet-footer"><span>It will land in Brain first.</span><button className="dark-button" type="submit">Save</button></div></form>}
    {sheet.kind === 'note' && <form onSubmit={saveNote}><input autoFocus value={noteDraft.title} onChange={(event) => setNoteDraft({ ...noteDraft, title: event.target.value })} placeholder="Note title" /><textarea value={noteDraft.body} onChange={(event) => setNoteDraft({ ...noteDraft, body: event.target.value })} placeholder="Start writing…" rows={5} /><div className="sheet-footer"><span>Permanent memory</span><button className="dark-button" type="submit"><Check size={14} /> Save note</button></div></form>}
    {sheet.kind === 'task' && <form onSubmit={saveTask}><input autoFocus value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} placeholder="What needs doing?" /><div className="sheet-option-label">Belongs to</div><div className="choice-row"><button type="button" className={!taskDraft.projectId ? 'is-selected' : ''} onClick={() => setTaskDraft({ ...taskDraft, projectId: '' })}>Loose task</button>{data.projects.map((project) => <button type="button" key={project.id} className={taskDraft.projectId === project.id ? 'is-selected' : ''} onClick={() => setTaskDraft({ ...taskDraft, projectId: project.id })}>{project.title}</button>)}</div><div className="task-schedule-fields"><label>Schedule<select value={taskDraft.recurrence} onChange={(event) => setTaskDraft({ ...taskDraft, recurrence: event.target.value as TaskDraft['recurrence'] })}><option value="once">One-off</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option></select></label><label>{taskDraft.recurrence === 'once' ? 'Due date (optional)' : 'Starts on'}<input type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} /></label></div><div className="sheet-footer"><span>{taskDraft.recurrence === 'once' ? 'One clear next step.' : 'Completion resets each scheduled day.'}</span>{editingTask && <button className="danger-sheet-button" type="button" onClick={() => onDeleteTask(sheet.id!)}><Trash2 size={13} /> Delete</button>}<button className="dark-button" type="submit"><Check size={14} /> Save task</button></div></form>}
    {sheet.kind === 'project' && <form onSubmit={saveProject}><input autoFocus value={projectDraft.title} onChange={(event) => setProjectDraft({ ...projectDraft, title: event.target.value })} placeholder="Project name" /><textarea value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} placeholder="What is this becoming?" rows={3} /><div className="sheet-footer"><span>{editingProject ? 'Refine the thread.' : 'Start with a thread.'}</span><button className="dark-button" type="submit"><FolderPlus size={14} /> {editingProject ? 'Save project' : 'Create project'}</button></div></form>}
    {sheet.kind === 'thought-actions' && thought && <div className="thought-action-sheet"><div className="selected-thought"><span className="thought-mark" /><p>{thought.text}</p></div><button onClick={() => onConvertThoughtToTask(thought)}><CheckCircle2 size={16} /><span>Turn into a task</span><ChevronRight size={14} /></button><button onClick={() => onConvertThoughtToNote(thought)}><FileText size={16} /><span>Turn into a note</span><ChevronRight size={14} /></button><button onClick={() => onPinThought(thought.id)}><Pin size={16} /><span>{thought.pinned ? 'Unpin thought' : 'Pin thought'}</span><ChevronRight size={14} /></button><button className="danger-row" onClick={() => onDeleteThought(thought.id)}><Trash2 size={16} /><span>Delete thought</span><ChevronRight size={14} /></button></div>}
    {sheet.kind === 'person' && <form onSubmit={savePerson} className="person-form"><input value={personDraft.birthday} onChange={(event) => setPersonDraft({ ...personDraft, birthday: event.target.value })} placeholder="Birthday" /><input value={personDraft.likes} onChange={(event) => setPersonDraft({ ...personDraft, likes: event.target.value })} placeholder="Likes · separate with commas" /><input value={personDraft.dislikes} onChange={(event) => setPersonDraft({ ...personDraft, dislikes: event.target.value })} placeholder="Dislikes" /><textarea value={personDraft.remember} onChange={(event) => setPersonDraft({ ...personDraft, remember: event.target.value })} placeholder="Things to remember" rows={3} /><input value={personDraft.gifts} onChange={(event) => setPersonDraft({ ...personDraft, gifts: event.target.value })} placeholder="Gift ideas" /><textarea value={personDraft.notes} onChange={(event) => setPersonDraft({ ...personDraft, notes: event.target.value })} placeholder="Notes" rows={2} /><button className="dark-button wide" type="submit"><Check size={14} /> Save memory</button></form>}
    {sheet.kind === 'health' && <form onSubmit={saveHealth}><div className="sheet-option-label">Energy today</div><div className="energy-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={healthDraft.energy === value ? 'is-selected' : ''} onClick={() => setHealthDraft({ ...healthDraft, energy: value })}>{value}</button>)}</div><input value={healthDraft.sleep} onChange={(event) => setHealthDraft({ ...healthDraft, sleep: event.target.value })} placeholder="Sleep · e.g. 7h 12m" /><textarea value={healthDraft.notes} onChange={(event) => setHealthDraft({ ...healthDraft, notes: event.target.value })} placeholder="How does your body feel?" rows={3} /><button className="dark-button wide" type="submit"><Check size={14} /> Save check-in</button></form>}
    {sheet.kind === 'journal' && <form onSubmit={saveJournal}><div className="choice-row journal-choice"><button type="button" className={journalMode === 'daily' ? 'is-selected' : ''} onClick={() => setJournalMode('daily')}>Daily</button><button type="button" className={journalMode === 'free' ? 'is-selected' : ''} onClick={() => setJournalMode('free')}>Free writing</button></div><input autoFocus value={journalDraft.title} onChange={(event) => setJournalDraft({ ...journalDraft, title: event.target.value })} placeholder="Title" />{journalMode === 'daily' ? <><div className="sheet-option-label">Mood</div><div className="energy-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={journalDraft.mood === value ? 'is-selected' : ''} onClick={() => setJournalDraft({ ...journalDraft, mood: value })}>{value}</button>)}</div><textarea value={journalDraft.howWasToday} onChange={(event) => setJournalDraft({ ...journalDraft, howWasToday: event.target.value })} placeholder="How was today?" rows={2} /><textarea value={journalDraft.whatWasGood} onChange={(event) => setJournalDraft({ ...journalDraft, whatWasGood: event.target.value })} placeholder="What was good?" rows={2} /><textarea value={journalDraft.onMind} onChange={(event) => setJournalDraft({ ...journalDraft, onMind: event.target.value })} placeholder="What's on your mind?" rows={2} /></> : <textarea value={journalDraft.onMind} onChange={(event) => setJournalDraft({ ...journalDraft, onMind: event.target.value })} placeholder="Write without organizing it." rows={8} />}<button className="dark-button wide" type="submit"><BookOpen size={14} /> Save entry</button></form>}
  </SheetFrame>
}

function ImageViewer({ asset, projects, collections, onClose, onDelete, onLinkProject, onLinkCollection }: { asset: ImageAsset; projects: Project[]; collections: AppState['collections']; onClose: () => void; onDelete: () => void; onLinkProject: (id: string) => void; onLinkCollection: (id: string) => void }) {
  return <motion.div className="image-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="viewer-top"><span className="eyebrow">INSPIRATION</span><IconButton label="Close image" onClick={onClose}><X size={18} /></IconButton></div><div className="viewer-art"><VisualArt asset={asset} showLabel /></div><div className="viewer-bottom"><div><h2>{asset.title}</h2><p>{asset.tags.join(' · ') || 'Unsorted visual'}</p></div><IconButton label="Delete image" onClick={onDelete}><Trash2 size={16} /></IconButton><div className="viewer-links"><span>Link to</span>{projects.slice(0, 2).map((project) => <button key={project.id} onClick={() => onLinkProject(project.id)}>{project.title}</button>)}{collections.slice(0, 2).map((collection) => <button key={collection.id} onClick={() => onLinkCollection(collection.id)}>{collection.name}</button>)}</div></div></motion.div>
}

export default App
