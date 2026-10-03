import React, { useId, useLayoutEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Circle, Pencil, X } from 'lucide-react'
import { previousLocalDate, taskCanToggleOn, taskCompletedOn, taskDrawerGroups, taskIsComplete } from '../daily'
import type { Project, Task } from '../types'
import type { SaveState } from '../hooks/useAppStorage'

export type TaskDrawerTab = 'yesterday' | 'all'
type Props = {
  tasks: Task[]; projects: Project[]; today: string; tab: TaskDrawerTab
  suspended: boolean; onTabChange: (tab: TaskDrawerTab) => void; onClose: () => void
  onEdit: (task: Task) => void; onToggle: (id: string) => void
  saveState: SaveState; onRetrySave: () => void
}
const fullDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day, 12))
}

export function TaskDrawer({ tasks, projects, today, tab, suspended, onTabChange, onClose, onEdit, onToggle, saveState, onRetrySave }: Props) {
  const id = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const scrollPositions = useRef<Record<TaskDrawerTab, number>>({ yesterday: 0, all: 0 })
  const close = useRef(onClose); close.current = onClose
  const reduced = useReducedMotion()
  const yesterday = previousLocalDate(today)
  const history = tasks.filter(task => taskCompletedOn(task, yesterday))
  const groups = taskDrawerGroups(tasks, today)

  useLayoutEffect(() => {
    if (suspended) return
    if (!opener.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const backgrounds = Array.from(dialog.current?.closest('.phone-app')?.querySelectorAll<HTMLElement>('.screen-layer, .bottom-nav') ?? [])
    const wasInert = backgrounds.map(node => node.inert)
    backgrounds.forEach(node => { node.inert = true })
    const target = lastFocus.current
    if (target?.isConnected && dialog.current?.contains(target)) target.focus({ preventScroll: true })
    else heading.current?.focus({ preventScroll: true })
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const fields = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]') ?? [])
        .filter(node => node.getClientRects().length)
      const first = fields[0], last = fields[fields.length - 1]
      if (!first || !last) return
      const active = document.activeElement
      if (!fields.includes(active as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); backgrounds.forEach((node, index) => { node.inert = wasInert[index] }) }
  }, [suspended])
  // Unlock the background (effect above) before restoring the opener on close.
  // Suspending for an editor must not return focus to Home in between dialogs.
  useLayoutEffect(() => () => { if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }) }, [])
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = scrollPositions.current[tab]
  }, [tab, suspended])
  useLayoutEffect(() => {
    // Completing/undoing can move a row between groups and remove its button.
    // Keep keyboard focus inside the drawer without jumping the list scroll.
    if (!suspended && lastFocus.current && !lastFocus.current.isConnected) {
      heading.current?.focus({ preventScroll: true })
      lastFocus.current = heading.current
    }
  }, [tasks, today, tab, suspended])

  const changeTab = (next: TaskDrawerTab) => {
    if (list.current) scrollPositions.current[tab] = list.current.scrollTop
    onTabChange(next)
  }
  const tabKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'yesterday' : event.key === 'End' ? 'all' : tab === 'all' ? 'yesterday' : 'all'
    changeTab(next)
    dialog.current?.querySelector<HTMLButtonElement>(`[data-task-tab="${next}"]`)?.focus({ preventScroll: true })
  }
  const projectName = (task: Task) => projects.find(project => project.id === task.projectId)?.title
  const metadata = (task: Task) => [projectName(task), task.recurrence === 'daily' ? 'Every day' : task.recurrence === 'weekdays' ? 'Weekdays' : null,
    task.dueDate ? `${task.recurrence && task.recurrence !== 'once' ? 'From' : 'Due'} ${fullDate(task.dueDate)}` : 'No due date'].filter(Boolean).join(' · ')

  return <div className="task-drawer-layer" style={suspended ? { display: 'none' } : undefined} aria-hidden={suspended || undefined} onClick={onClose}>
    <motion.div ref={dialog} className="task-drawer" role="dialog" aria-modal={!suspended || undefined} aria-labelledby={`${id}-heading`}
      onClick={event => event.stopPropagation()} onFocusCapture={event => { if (event.target instanceof HTMLElement) lastFocus.current = event.target }}
      initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .18 }}>
      <header className="task-drawer-heading"><div><span className="eyebrow">YOUR TASKS</span><h2 ref={heading} id={`${id}-heading`} tabIndex={-1}>A little look back.</h2></div>
        <button type="button" className="icon-button" aria-label="Close task history" onClick={onClose}><X size={18} /></button></header>
      <div className="task-drawer-tabs" role="tablist" aria-label="Task views">
        {(['yesterday', 'all'] as const).map(value => <button key={value} type="button" role="tab" data-task-tab={value} id={`${id}-${value}`}
          aria-selected={tab === value} aria-controls={`${id}-panel`} tabIndex={tab === value ? 0 : -1} onKeyDown={tabKey} onClick={() => changeTab(value)}>{value === 'yesterday' ? 'Yesterday' : 'All tasks'}</button>)}
      </div>
      <div className="task-drawer-description">{tab === 'yesterday' ? <><time dateTime={yesterday}>{fullDate(yesterday)}</time><p>Recorded completions only. Titles reflect your current tasks.</p></> : <><time dateTime={today}>{fullDate(today)}</time><p>Every task, in one place. Completion actions apply to today.</p></>}</div>
      {saveState.kind === 'error' && <div className="task-drawer-save-error" role="alert">Changes not saved.<button type="button" onClick={onRetrySave}>Retry</button></div>}
      <div ref={list} className="task-drawer-list" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0}
        onScroll={() => { if (list.current) scrollPositions.current[tab] = list.current.scrollTop }}>
        {tab === 'yesterday' ? history.length ? <ul className="task-history-list">{history.map(task => <li key={task.id}><Check size={18} aria-hidden="true" /><div><strong>{task.title}</strong>{projectName(task) && <small>{projectName(task)}</small>}</div></li>)}</ul>
          : <p className="task-drawer-empty">No recorded completions yesterday.</p>
          : groups.length ? groups.map(group => <section className="task-index-group" key={group.id} aria-label={group.label}><h3>{group.label}<span>{group.tasks.length}</span></h3><ul>{group.tasks.map(task => {
            const complete = taskIsComplete(task, today), canToggle = taskCanToggleOn(task, today)
            return <li key={task.id} className={complete ? 'is-complete' : ''}>
              {canToggle ? <button type="button" className="task-index-toggle" aria-label={`${complete ? 'Undo completion of' : 'Complete'} ${task.title}`} aria-pressed={complete} onClick={() => onToggle(task.id)}>{complete ? <Check size={18} /> : <Circle size={18} />}</button>
                : <span className="task-index-pending" aria-label="Not scheduled today"><Circle size={18} aria-hidden="true" /></span>}
              <div><strong>{task.title}</strong><small>{metadata(task)}</small></div>
              <button type="button" className="task-index-edit icon-button" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}><Pencil size={17} /></button>
            </li>
          })}</ul></section>) : <p className="task-drawer-empty">No tasks yet. Add your first from Home.</p>}
      </div>
    </motion.div>
  </div>
}
