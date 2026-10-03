import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { MotionConfig } from 'framer-motion'
import { HomeScreen, RenderSheet } from 'lumen-home-baseline'
import { BottomNav } from '../../src/components/VisualComponents'
import { observeEditorViewport } from '../../src/mobileViewport'
import { TaskDrawer } from '../../src/components/TaskDrawer'
import { baselineData, baselineDate } from './home-baseline-data.mjs'

const profiles = [
  { width: 390, height: 844, safeTop: 47, safeBottom: 34, keyboard: 500 },
  { width: 320, height: 568, safeTop: 20, safeBottom: 0, keyboard: 300 },
  { width: 844, height: 390, safeTop: 0, safeBottom: 21, keyboard: 228 },
]
const query = new URLSearchParams(location.search)
const profile = profiles[Number(query.get('profile')) || 0]
const theme = query.get('theme') === 'light' ? 'light' : 'dark'
document.documentElement.setAttribute('data-lumen-theme', theme)

const styles = await Promise.all(['styles', 'polish', 'mobile', 'welcome', 'theme', 'settings', 'glass', 'home', 'taskDrawer'].map(async name => {
  const response = await fetch(`/src/${name}.css?direct`)
  if (!response.ok) throw new Error(`Missing ${name}.css`)
  return response.text()
}))
const style = document.createElement('style')
style.textContent = styles.join('\n')
  .replace(/\b100(?:dvh|lvh|vh)\b/g, `${profile.height}px`)
  .replace(/\(display-mode: standalone\)/g, 'all')
  .replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,
    (_, side) => `${side === 'top' ? profile.safeTop : side === 'bottom' ? profile.safeBottom : 0}px`)
document.head.appendChild(style)
const viewport = Object.assign(new EventTarget(), { height: profile.height, offsetTop: 0, scale: 1 })
Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })

let setCase: (kind: string) => void, setEditor: (open: boolean) => void, setDrawer: (tab: 'yesterday' | 'all' | null) => void
function Fixture() {
  const [kind, updateCase] = useState('open')
  const [open, updateEditor] = useState(false)
  const [drawer, updateDrawer] = useState<'yesterday' | 'all' | null>(null)
  const [draft, setDraft] = useState({ title: 'Fixture retained draft', projectId: '', dueDate: baselineDate, recurrence: 'once' })
  setCase = updateCase; setEditor = updateEditor; setDrawer = updateDrawer
  const data = baselineData(kind)
  return <div className="deployed-app-root"><div className="phone-app deployed-app-screen">
    <div className="screen-layer"><HomeScreen data={data} today={baselineDate} saveState={{ kind: 'saved' }}
      onRetrySave={() => {}} onAddTask={() => updateEditor(true)} onEditTask={() => updateEditor(true)} onOpenTaskHistory={() => updateDrawer('yesterday')}
      onToggleTask={() => updateCase(kind === 'done' ? 'open' : 'done')} theme={theme} characterActive={false} mirror /></div>
    <BottomNav active="home" onChange={() => {}} quickActions={[]} motionId="home-baseline" />
    {drawer && <TaskDrawer tasks={data.tasks} projects={data.projects} today={baselineDate} tab={drawer} suspended={open}
      onTabChange={updateDrawer} onClose={() => updateDrawer(null)} onEdit={() => updateEditor(true)} onToggle={() => {}}
      saveState={{ kind: 'saved' }} onRetrySave={() => {}} />}
    {open && <RenderSheet sheet={{ kind: 'task' }} setSheet={() => updateEditor(false)} data={data}
      taskDraft={draft} setTaskDraft={setDraft} saveTask={event => event.preventDefault()} onDeleteTask={() => {}} />}
  </div></div>
}

const root = createRoot(document.querySelector('#root')!)
flushSync(() => root.render(<MotionConfig reducedMotion="always"><Fixture /></MotionConfig>))
const stop = observeEditorViewport(window)
window.addEventListener('pagehide', stop, { once: true })
const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
const pauseEntrance = () => new Promise(resolve => setTimeout(resolve, 650))
const round = (n: number) => Math.round(n * 100) / 100
const box = (selector: string) => {
  const node = document.querySelector<HTMLElement>(selector)
  if (!node) return null
  const rect = node.getBoundingClientRect(), css = getComputedStyle(node)
  return { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height), bottom: round(rect.bottom),
    scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, scrollTop: node.scrollTop,
    scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
    overflowY: css.overflowY, position: css.position, transform: css.transform }
}
const homeSnapshot = () => Object.fromEntries([
  ['app', '.deployed-app-root'], ['page', '.screen-layer'], ['home', '.home-screen'], ['heading', '.home-liquid-heading'],
  ['character', '.home-character'], ['dateControls', '.home-task-heading'], ['carousel', '.home-task-carousel'],
  ['empty', '.home-task-empty'], ['completion', '.home-day-complete'], ['nav', '.bottom-nav'], ['plus', '.nav-capture'],
].map(([name, selector]) => [name, box(selector)]))
const editorSnapshot = () => ({ ...homeSnapshot(), layer: box('.sheet-layer'), dialog: box('.bottom-sheet'),
  head: box('.sheet-head'), title: box('input[placeholder="What needs doing?"]'), footer: box('.sheet-footer'),
  choices: box('.choice-row'), projectChoices: document.querySelectorAll('.choice-row button').length,
  save: box('.sheet-footer button[type="submit"]'), keyboardAttribute: document.documentElement.getAttribute('data-lumen-keyboard'),
  content: box('.task-editor-content'), draftValue: document.querySelector<HTMLInputElement>('[data-task-title]')?.value,
  editorTop: document.documentElement.style.getPropertyValue('--lumen-editor-top'),
  editorHeight: document.documentElement.style.getPropertyValue('--lumen-editor-height'),
  visualHeight: viewport.height, visualTop: viewport.offsetTop,
  focused: document.activeElement?.getAttribute('placeholder') })

try {
  const report: any = { profile, theme, simulation: 'Desktop layout fixture, NOT native iOS evidence; mirror/static character for geometry', homes: {}, editors: {} }
  for (const kind of ['open', 'done', 'empty', 'mixed', 'long']) {
    flushSync(() => setCase(kind)); await settle()
    report.homes[kind] = homeSnapshot()
  }
  for (const kind of ['open', 'many']) {
    flushSync(() => { setCase(kind); setEditor(true) }); await pauseEntrance(); await settle()
    report.editors[kind] = { closed: editorSnapshot() }
    viewport.height = profile.keyboard; viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize')); await settle()
    report.editors[kind].keyboard = editorSnapshot()
    viewport.offsetTop = profile.width < 500 ? 80 : 0
    viewport.dispatchEvent(new Event('scroll')); await settle()
    report.editors[kind].panned = editorSnapshot()
    const content = document.querySelector<HTMLElement>('.task-editor-content') ?? document.querySelector<HTMLElement>('.bottom-sheet')!
    content.scrollTop = content.scrollHeight; await settle()
    report.editors[kind].scrolled = editorSnapshot()
    viewport.height = profile.height; viewport.offsetTop = 0
    viewport.dispatchEvent(new Event('resize')); await new Promise(resolve => setTimeout(resolve, 220)); await settle()
    report.editors[kind].dismissedStillFocused = editorSnapshot()
    flushSync(() => setEditor(false)); await settle()
  }
  // Invariant checks are separate from captured defects. These must stay true
  // after Phase 2; the recorded layout defects should disappear in later phases.
  report.checks = []
  const check = (condition: boolean, name: string) => report.checks.push({ name, passed: condition })
  for (const kind of ['open', 'many']) {
    const states = report.editors[kind]
    for (const snapshot of Object.values(states) as any[]) {
      check(snapshot.app.height === profile.height && snapshot.page.height === profile.height
        && snapshot.nav.bottom === report.homes.open.nav.bottom, `${kind}: shell/page/nav unchanged`)
    }
    check(states.keyboard.layer.height === profile.keyboard, `${kind}: keyboard layer uses visible height`)
    check(states.panned.layer.y === viewport.offsetTop + (profile.width < 500 ? 80 : 0), `${kind}: panned layer uses offset`)
    check(states.dismissedStillFocused.keyboardAttribute === null && states.dismissedStillFocused.layer.height === profile.height
      && states.dismissedStillFocused.focused === 'What needs doing?', `${kind}: dismissal recovers while still focused`)
    check(states.closed.projectChoices === (kind === 'many' ? 25 : 4), `${kind}: expected project fixture loaded`)
    check(states.keyboard.title.y >= states.keyboard.content.y
      && states.keyboard.title.bottom <= states.keyboard.content.bottom,
      `${kind}: complete focused title visible above keyboard`)
    for (const state of ['keyboard', 'panned', 'scrolled']) {
      const snapshot = states[state]
      check(snapshot.head.y >= snapshot.layer.y && snapshot.head.bottom <= snapshot.layer.bottom
        && snapshot.save.y >= snapshot.layer.y && snapshot.save.bottom <= snapshot.layer.bottom - 8,
        `${kind}/${state}: heading and Save simultaneously visible`)
      check(snapshot.draftValue === 'Fixture retained draft', `${kind}/${state}: draft retained`)
    }
    check(states.dismissedStillFocused.draftValue === 'Fixture retained draft', `${kind}: dismissal retains draft`)
  }
  check(report.homes.open.character.width === 216 && report.homes.open.character.height === 216, '216px character retained')
  // Exercise the actual drawer, including suspension for the same task editor.
  flushSync(() => { setCase('mixed'); setDrawer('yesterday') }); await settle()
  report.drawer = { history: box('.task-drawer-list'), heading: box('.task-drawer-heading'), dialog: box('.task-drawer') }
  check(document.querySelectorAll('.task-history-list li').length === 1, 'history contains only the recorded yesterday task')
  check(document.querySelectorAll('.task-history-list button').length === 0, 'history is read-only')
  check(report.drawer.dialog.y >= profile.safeTop && report.drawer.dialog.bottom <= profile.height - Math.max(12, profile.safeBottom), 'drawer fits safe drawing area')
  flushSync(() => setDrawer('all')); await settle()
  const selectedTab = getComputedStyle(document.querySelector('[data-task-tab="all"]')!)
  const otherTab = getComputedStyle(document.querySelector('[data-task-tab="yesterday"]')!)
  check(selectedTab.backgroundColor !== otherTab.backgroundColor, 'selected tab has a distinct themed surface')
  check(selectedTab.color !== otherTab.color, 'selected tab has matching contrasting text')
  const taskList = document.querySelector<HTMLElement>('.task-drawer-list')!
  const home = document.querySelector<HTMLElement>('.home-screen')!
  const homeScroll = home.scrollTop
  check(document.querySelectorAll('.task-index-group li').length === 8, 'All tasks exposes every fixture task exactly once')
  check(!document.querySelector('button[aria-label="Complete Fixture future"]') && !document.querySelector('button[aria-label="Complete Fixture weekdays"]'), 'future/off-day completion unavailable')
  taskList.scrollTop = taskList.scrollHeight; taskList.dispatchEvent(new Event('scroll')); await settle()
  const drawerScroll = taskList.scrollTop
  check(drawerScroll > 0 && home.scrollTop === homeScroll, 'long drawer scroll stays internal')
  const edit = document.querySelector<HTMLButtonElement>('button[aria-label="Edit Fixture future"]')!
  edit.focus({ preventScroll: true }); edit.click(); await settle()
  check(getComputedStyle(document.querySelector('.task-drawer-layer')!).display === 'none' && !!document.querySelector('.task-editor-sheet'), 'one active dialog during editing')
  flushSync(() => setEditor(false)); await settle()
  check(taskList.scrollTop === drawerScroll && document.querySelector('[data-task-tab="all"]')?.getAttribute('aria-selected') === 'true', 'editor returns to same tab and scroll')
  check(document.activeElement === edit, 'editor return restores row focus')
  check(document.querySelector('.bottom-nav')?.hasAttribute('inert') && document.querySelector('.screen-layer')?.hasAttribute('inert'), 'drawer keeps underlying Home/nav inert')
  flushSync(() => setDrawer(null)); await settle()
  check(!document.querySelector('.bottom-nav')?.hasAttribute('inert') && !document.querySelector('.screen-layer')?.hasAttribute('inert'), 'drawer close unlocks background')
  flushSync(() => setCase('open')); await settle()
  const node = document.querySelector('#case-report')!
  node.textContent = JSON.stringify(report, null, 2)
  node.setAttribute('data-ready', 'true')
  // Optional local screenshot state; no records or real keyboard are involved.
  if (query.get('view') === 'keyboard') {
    flushSync(() => setEditor(true)); await settle()
    viewport.height = profile.keyboard; viewport.dispatchEvent(new Event('resize')); await settle()
  }
  if (query.get('view') === 'history' || query.get('view') === 'all') {
    flushSync(() => { setCase('mixed'); setDrawer(query.get('view') === 'all' ? 'all' : 'yesterday') }); await settle()
  }
} catch (error) {
  document.querySelector('#case-report')!.textContent = String(error)
  document.querySelector('#case-report')!.setAttribute('data-error', 'true')
}
