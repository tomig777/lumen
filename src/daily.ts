import type { Task } from './types'

export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function previousLocalDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day - 1, 12))
}

export function selectedDateAfterRollover(selected: string, previousToday: string, newToday: string): string {
  return selected === previousToday ? newToday : selected
}

export function taskCompletedOn(task: Task, date: string): boolean {
  // Legacy boolean-only completions have no trustworthy date. Never invent one.
  return !!task.completedOn?.some((event) => event.date === date)
}

export function taskIsComplete(task: Task, date: string): boolean {
  if (task.recurrence === 'daily' || task.recurrence === 'weekdays') return taskCompletedOn(task, date)
  return task.completed || taskCompletedOn(task, date)
}

export function taskScheduledOn(task: Task, date: string): boolean {
  if (task.dueDate && task.dueDate > date) return false
  if (task.recurrence === 'daily') return true
  if (task.recurrence === 'weekdays') {
    const [year, month, day] = date.split('-').map(Number)
    const weekday = new Date(year, month - 1, day, 12).getDay()
    return weekday !== 0 && weekday !== 6
  }
  return task.dueDate === date
}

export function classifyTasks(tasks: Task[], date: string) {
  const yesterday = previousLocalDate(date)
  const today = tasks.filter((task) => taskScheduledOn(task, date))
  const overdue = tasks.filter((task) => task.recurrence !== 'daily' && task.recurrence !== 'weekdays' && !!task.dueDate && task.dueDate < date && !taskIsComplete(task, date))
  const unscheduled = tasks.filter((task) => !task.dueDate && task.recurrence !== 'daily' && task.recurrence !== 'weekdays' && !taskIsComplete(task, date))
  const yesterdayDone = tasks.filter((task) => taskCompletedOn(task, yesterday))
  const doneToday = today.filter((task) => taskIsComplete(task, date))
  const completedElsewhereToday = tasks.filter((task) => !today.includes(task) && taskCompletedOn(task, date))
  return { today, overdue, unscheduled, yesterdayDone, doneToday, completedElsewhereToday }
}

export function toggleTaskForDate(task: Task, date: string, at: string): Task {
  const done = taskIsComplete(task, date)
  const previous = task.completedOn ?? []
  const completedOn = done ? previous.filter((event) => event.date !== date) : [...previous.filter((event) => event.date !== date), { date, at }]
  return { ...task, completed: task.recurrence === 'daily' || task.recurrence === 'weekdays' ? task.completed : !done, completedOn }
}
