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
  { width: 390, height: 844, safeTop: 47, safeBottom: 34, safeLeft: 0, safeRight: 0, keyboard: 500 },
  { width: 320, height: 568, safeTop: 20, safeBottom: 0, safeLeft: 0, safeRight: 0, keyboard: 300 },
  { width: 844, height: 390, safeTop: 0, safeBottom: 21, safeLeft: 47, safeRight: 47, keyboard: 228 },
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
    (_, side) => `${side === 'top' ? profile.safeTop : side === 'bottom' ? profile.safeBottom : side === 'left' ? profile.safeLeft : profile.safeRight}px`)
document.head.appendChild(style)
const largerTextStyle = document.createElement('style')
const largeScope = 'html[data-lumen-theme] [data-large-text="true"] .phone-app.phone-app .home-redesigned'
largerTextStyle.textContent = `${largeScope} .home-liquid-heading h1 {font-size:15px;line-height:18px}
  ${largeScope} .home-liquid-heading strong {font-size:53px}
  ${largeScope} .home-liquid-state {font-size:15px}
  ${largeScope} .home-task-heading h2 {font-size:36px}
  ${largeScope} .home-task-card strong {font-size:25px}
  ${largeScope} .home-task-summary {font-size:17px}`
document.head.appendChild(largerTextStyle)
const viewport = Object.assign(new EventTarget(), { height: profile.height, offsetTop: 0, scale: 1 })
Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })

let setCase: (kind: string) => void, setEditor: (open: boolean) => void, setDrawer: (tab: 'yesterday' | 'all' | null) => void
function Fixture() {
  const [kind, updateCase] = useState('open')
  const [open, updateEditor] = useState(false)
  const [drawer, updateDrawer] = useState<'yesterday' | 'all' | null>(null)
  const [draft, setDraft] = useState({ title: 'Fixture retained draft', projectId: '', dueDate: baselineDate, recurrence: 'once' })
  setCase = updateCase; setEditor = updateEditor; setDrawer = updateDrawer
  const data = baselineData(kind === 'large' ? 'long' : kind)
  return <div className="deployed-app-root" data-large-text={kind === 'large'}><div className="phone-app deployed-app-screen">
    <div className="screen-layer"><HomeScreen data={data} today={kind === 'long-date' ? '2026-09-30' : baselineDate} saveState={{ kind: kind === 'error' ? 'error' : 'saved' }}
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
    overflowY: css.overflowY, position: css.position, transform: css.transform, fontSize: css.fontSize, lineHeight: css.lineHeight,
    userSelect: css.userSelect, webkitUserSelect: css.getPropertyValue('-webkit-user-select'), touchAction: css.touchAction,
    paddingTop: parseFloat(css.paddingTop), paddingBottom: parseFloat(css.paddingBottom) }
}
const homeSnapshot = () => Object.fromEntries([
  ['app', '.deployed-app-root'], ['page', '.screen-layer'], ['home', '.home-screen'], ['heading', '.home-liquid-heading'],
  ['character', '.home-character'], ['dateControls', '.home-task-heading'], ['carousel', '.home-task-carousel'],
  ['stage', '.liquid-bowl-stage'], ['titleBlock', '.home-task-card-title-block'], ['taskTitle', '.home-task-card strong'],
  ['slot', '.home-task-slot'], ['card', '.home-task-card'], ['edit', '.home-task-card-edit'], ['retry', '.home-save-retry'],
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
  for (const kind of ['open', 'done', 'empty', 'mixed', 'long', 'long-date', 'large', 'error']) {
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
    check(['auto','text'].includes(states.closed.title.userSelect) && ['auto','text'].includes(states.keyboard.title.userSelect), `${kind}: task editor keeps text selection with Home callouts disabled`)
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
  for (const [kind, snapshot] of Object.entries(report.homes) as [string, any][]) {
    check(snapshot.home.overflowY === 'hidden' && snapshot.home.scrollHeight <= snapshot.home.clientHeight + 1, `${kind}: Home has no vertical overflow`)
    check(snapshot.home.userSelect === 'none' && snapshot.character.userSelect === 'none'
      && (!snapshot.taskTitle || snapshot.taskTitle.userSelect === 'none'), `${kind}: Home/character/card are not selectable`)
    check(snapshot.slot.bottom <= snapshot.nav.y - 20 && snapshot.slot.y >= snapshot.dateControls.bottom, `${kind}: task slot clears controls and nav`)
    check(snapshot.character.width > 0 && snapshot.character.y >= snapshot.heading.bottom && snapshot.character.bottom <= snapshot.stage.bottom, `${kind}: character remains within its stage`)
    check(snapshot.carousel ? snapshot.carousel.y === snapshot.slot.y && Math.abs(snapshot.carousel.height - snapshot.slot.height) < 1 : snapshot.empty.y === snapshot.slot.y && Math.abs(snapshot.empty.height - snapshot.slot.height) < 1, `${kind}: cards/empty occupy the allocated slot`)
    check(!snapshot.completion, `${kind}: no visible completion paragraph`)
    check(!snapshot.edit || snapshot.edit.y >= snapshot.slot.y && snapshot.edit.bottom <= snapshot.slot.bottom, `${kind}: edit action is not clipped`)
    check(!snapshot.retry || snapshot.retry.height >= 44 && snapshot.retry.bottom <= snapshot.nav.y - 20, `${kind}: error Retry remains reachable`)
    check(snapshot.heading.x >= profile.safeLeft && snapshot.slot.x + snapshot.slot.width <= profile.width - profile.safeRight, `${kind}: content respects horizontal safe areas`)
    check(!snapshot.taskTitle || Math.min(snapshot.taskTitle.bottom, snapshot.titleBlock.bottom - snapshot.titleBlock.paddingBottom)
      - Math.max(snapshot.taskTitle.y, snapshot.titleBlock.y + snapshot.titleBlock.paddingTop) >= parseFloat(snapshot.taskTitle.lineHeight) - 1, `${kind}: at least one full task-title line remains readable`)
  }
  check(parseFloat(report.homes.large.taskTitle.fontSize) > parseFloat(report.homes.open.taskTitle.fontSize), 'larger-text fixture is actually enlarged')
  check(report.homes.open.slot.y === report.homes.done.slot.y && report.homes.open.slot.height === report.homes.done.slot.height
    && report.homes.open.slot.y === report.homes.empty.slot.y && report.homes.open.slot.height === report.homes.empty.slot.height, 'empty/open/all-done slot geometry identical')
  if (profile.width === 390) {
    check(report.homes.open.character.width === 216 && report.homes.open.character.height === 216, 'normal portrait 216px character retained')
    check(Math.abs(report.homes.open.character.y - 148.39) < 1, 'normal portrait character origin retained')
  }
  flushSync(() => setCase('mixed')); await settle()
  const fixedHome = document.querySelector<HTMLElement>('.home-screen')!
  fixedHome.scrollTop = 100; await settle()
  check(fixedHome.scrollTop === 0, 'Home cannot be vertically scrolled')
  // Reproduce R3F's inline pointer-events:auto + overflow:hidden wrapper inside
  // the static mirror. It must not cut gesture arbitration off before the hero.
  const character = document.querySelector<HTMLElement>('.home-character')!
  const rendererHitSurface = document.createElement('div')
  rendererHitSurface.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:auto'
  const canvas = document.createElement('canvas');canvas.style.cssText = 'width:100%;height:100%'
  rendererHitSurface.appendChild(canvas);character.appendChild(rendererHitSurface)
  const characterBox = character.getBoundingClientRect()
  const hit = document.elementFromPoint(characterBox.x+characterBox.width/2,characterBox.y+characterBox.height/2)
  check(!!hit?.closest('.home-liquid-focus') && !hit.closest('.home-character'), 'renderer inline auto cannot intercept the Home gaze gesture surface')
  rendererHitSurface.remove()
  check(!document.querySelector('.daily-task-group'), 'lower Home groups removed without removing drawer access')
  const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('.home-task-controls button'))
  check(controls.map(button=>button.getAttribute('aria-label')).join('|') === 'Add task|Yesterday and all tasks|Previous task|Next task', 'Replay between Add and Previous')
  check(controls.every(button=>button.getBoundingClientRect().width >= 44 && button.getBoundingClientRect().height >= 44), 'all Home controls retain touch targets')
  const carousel = document.querySelector<HTMLElement>('.home-task-carousel')!
  controls[3].click(); await new Promise(resolve => setTimeout(resolve, 450)); await settle()
  check(carousel.scrollLeft > 0 && fixedHome.scrollTop === 0, 'horizontal task navigation works without moving Home')
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
  if (query.get('view') === 'home' || query.get('view') === 'large' || query.get('view') === 'error') {
    flushSync(() => setCase(query.get('view') === 'home' ? 'mixed' : query.get('view')!)); await settle()
  }
} catch (error) {
  document.querySelector('#case-report')!.textContent = String(error)
  document.querySelector('#case-report')!.setAttribute('data-error', 'true')
}
