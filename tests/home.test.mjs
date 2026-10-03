import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const source = app.match(/function HomeScreen[\s\S]*?(?=\nfunction BackupCounts)/)[0]
const helpers = ['dateFromIso', 'formatLongDate'].map(name => app.match(new RegExp(`function ${name}[^]*?\\n}`))[0]).join('\n')
const css = await readFile(new URL('../src/home.css', import.meta.url), 'utf8')
const dailyModule = { exports: {} }
new Function('require','module','exports',transformSync(await readFile(new URL('../src/daily.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'cjs' }).code)(require,dailyModule,dailyModule.exports)
const daily = dailyModule.exports
const { code } = transformSync(`import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Circle, Plus, ChevronLeft, ChevronRight, Pencil, RotateCcw } from 'lucide-react';
import { classifyTasks, taskIsComplete } from './daily';
import { HomeCharacter } from './HomeCharacter';
import { createGazeInput } from './components/characterPointer';
${helpers}\n${source}\nexport { HomeScreen };`, { loader: 'tsx', format: 'cjs', jsx: 'transform' })
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.children?.map(text).join('') ?? ''
const task = (id, fields = {}) => ({ id, title: `Task ${id}`, priority: 'medium', completed: false, ...fields })
const pointerModule = { exports: {} }
new Function('module','exports',transformSync(await readFile(new URL('../src/components/characterPointer.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(pointerModule,pointerModule.exports)
const date = '2026-10-03'

function harness(tasks, { reduced = false, save = 'saved', today = date } = {}) {
  const old = globalThis.window
  let nextId = 1, retries = 0, adds = 0, historyOpens = 0
  const timers = new Map(), frames = new Map(), toggles = [], edits = [], scrolls = [], reactions = []
  globalThis.window = { setTimeout: fn => { const id = nextId++; timers.set(id,fn); return id }, clearTimeout: id => timers.delete(id), requestAnimationFrame: fn => { const id = nextId++; frames.set(id,fn); return id }, cancelAnimationFrame: id => frames.delete(id) }
  const components = new Map()
  const motion = new Proxy({}, { get: (_,tag) => {
    if (!components.has(tag)) components.set(tag, React.forwardRef(({ layout, transition, layoutScroll, ...props },ref) => React.createElement(tag,{ ...props,ref,'data-layout':layout,'data-transition':transition })))
    return components.get(tag)
  } })
  const module = { exports: {} }
  new Function('require','module','exports',code)(name => name === './daily' ? daily : name === './components/characterPointer' ? pointerModule.exports : name === './HomeCharacter' ? { HomeCharacter: ({input}) => { React.useLayoutEffect(()=>input.subscribeReaction(value=>reactions.push(value)),[input]);return React.createElement('div', { 'aria-hidden': true }) } } : name === 'framer-motion' ? { motion,useReducedMotion:()=>reduced } : require(name),module,module.exports)
  const carousel = { scrollLeft: 123, querySelector: () => ({ offsetWidth: 244 }), querySelectorAll: () => [...props.data.tasks.filter(item=>daily.taskScheduledOn(item,props.today)&&!daily.taskIsComplete(item,props.today)),...props.data.tasks.filter(item=>daily.taskScheduledOn(item,props.today)&&daily.taskIsComplete(item,props.today))].map((item,index)=>({dataset:{homeTaskId:item.id},offsetLeft:index*254})), scrollBy: options => scrolls.push(options) }
  const props = { data: { tasks }, today, saveState: { kind: save }, onRetrySave: () => retries++, onAddTask: () => adds++, onOpenTaskHistory: () => historyOpens++, onEditTask: item => edits.push(item.id), onToggleTask(id) {
    toggles.push(id); props.data = { tasks: props.data.tasks.map(item => item.id === id ? daily.toggleTaskForDate(item,props.today,`${date}T12:00:00Z`) : item) }; render()
  } }
  let view
  const render = () => view.update(React.createElement(module.exports.HomeScreen,props))
  act(() => { view = create(React.createElement(module.exports.HomeScreen,props),{ createNodeMock: element => element.props.className?.includes('home-task-carousel') ? carousel : null }) })
  return { view,props,timers,frames,toggles,edits,scrolls,carousel,reactions,
    get retries() { return retries }, get adds() { return adds }, get historyOpens() { return historyOpens },
    click(label) { const button = view.root.findAllByType('button').find(node => node.props['aria-label'] === label || text(node) === label); assert.ok(button,label); act(() => button.props.onClick()) },
    flushTimers() { act(() => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn=>fn()) }) },
    flushFrames() { act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn=>fn()) }) },
    dispose() { act(()=>view.unmount()); globalThis.window = old },
  }
}

test('Home keeps real progress/order but delegates non-daily groups to the approved drawer', () => {
  const h = harness([
    task('done',{ dueDate:date,completed:true,completedOn:[{date,at:'noon'}] }), task('open',{dueDate:date}),
    task('late',{dueDate:'2026-10-02'}), task('loose'), task('elsewhere',{completed:true,completedOn:[{date,at:'noon'}]}),
    task('yesterday',{completed:true,completedOn:[{date:'2026-10-02',at:'noon'}]}),task('future',{dueDate:'2026-10-04'}),
  ])
  try {
    const meter = h.view.root.findByProps({role:'meter'})
    assert.equal(meter.props['aria-valuenow'],50); assert.equal(meter.props['aria-valuetext'],'1 of 2 scheduled tasks complete')
    assert.equal(h.view.root.findByType('time').props.dateTime,date); assert.equal(text(h.view.root.findByType('time')),'October 3')
    const cards = h.view.root.findAllByType('button').filter(node=>node.props.className?.startsWith('home-task-card priority'))
    assert.deepEqual(cards.map(node=>node.props['aria-label']),['Mark Task open complete','Mark Task done incomplete'])
    assert.deepEqual(cards.map(node=>node.props['aria-pressed']),[false,true])
    for (const label of ['OVERDUE','UNSCHEDULED','FINISHED TODAY','YESTERDAY · FINISHED']) assert.equal(text(h.view.toJSON()).includes(label),false)
    assert.equal(text(h.view.toJSON()).includes('Task future'),false)
    h.click('Yesterday and all tasks'); assert.equal(h.historyOpens,1)
    assert.deepEqual(h.props.data.tasks.map(item=>item.id),['done','open','late','loose','elsewhere','yesterday','future'])
    assert.deepEqual(h.toggles,[])
    h.click('Edit Task done'); assert.deepEqual(h.edits,['done'])
  } finally { h.dispose() }
})

test('empty and all-done days remain explicit, accurate and reversible', () => {
  const empty = harness([])
  try {
    assert.equal(empty.view.root.findByProps({role:'meter'}).props['aria-valuenow'],0)
    assert.ok(text(empty.view.toJSON()).includes('Nothing scheduled today.'))
    for (const label of ['Previous task','Next task']) assert.equal(empty.view.root.findByProps({'aria-label':label}).props.disabled,true)
    empty.click('Add task'); assert.equal(empty.adds,1)
    empty.click('Yesterday and all tasks'); assert.equal(empty.historyOpens,1)
  } finally { empty.dispose() }
  const done = harness([task('one',{dueDate:date,completed:true})])
  try {
    assert.equal(done.view.root.findByProps({role:'meter'}).props['aria-valuenow'],100)
    const announcement = done.view.root.findByProps({className:'home-completion-announcement'})
    assert.equal(text(announcement),'All scheduled tasks complete.')
    assert.equal(announcement.props['aria-live'],'polite')
    assert.equal(done.view.root.findAllByProps({className:'home-day-complete'}).length,0)
    assert.equal(done.view.root.findAllByProps({className:'home-task-slot'}).length,1)
    done.click('Mark Task one incomplete'); assert.equal(done.view.root.findByProps({role:'meter'}).props['aria-valuenow'],0)
    assert.deepEqual(done.toggles,['one'])
    assert.equal(text(done.view.root.findByProps({className:'home-completion-announcement'})),'')
  } finally { done.dispose() }
})

test('completion is single-shot, reorders open before done, and restores carousel position', () => {
  const h = harness([task('one',{dueDate:date}),task('two',{dueDate:date})])
  try {
    h.click('Mark Task one complete'); h.click('Mark Task one complete'); h.click('Mark Task two complete')
    assert.equal(h.timers.size,1); assert.deepEqual(h.toggles,[])
    h.flushTimers(); assert.deepEqual(h.toggles,['one']); assert.equal(h.frames.size,1)
    h.flushFrames(); assert.equal(h.carousel.scrollLeft,123)
    assert.equal(h.view.root.findByProps({role:'meter'}).props['aria-valuenow'],50)
    const cards = h.view.root.findAllByType('button').filter(node=>node.props.className?.startsWith('home-task-card priority'))
    assert.deepEqual(cards.map(node=>node.props['aria-label']),['Mark Task two complete','Mark Task one incomplete'])
    h.click('Next task'); assert.deepEqual(h.scrolls,[{left:254,behavior:'smooth'}])
  } finally { h.dispose() }
})

test('Home reactions require an applied user completion; reload/restore/rollover and undo do not celebrate',()=>{
  const h=harness([task('one',{dueDate:date}),task('two',{dueDate:date})])
  try {
    assert.deepEqual(h.reactions,[])
    h.click('Mark Task one complete');assert.deepEqual(h.reactions,[])
    h.flushTimers();h.flushFrames();assert.deepEqual(h.reactions,['happy'])
    h.click('Mark Task two complete');h.flushTimers();h.flushFrames();assert.deepEqual(h.reactions,['happy','all-done'])
    h.click('Mark Task two incomplete');assert.deepEqual(h.reactions,['happy','all-done','undo'])
    h.props.data={tasks:[task('restored',{dueDate:date,completed:true})]}
    act(()=>h.view.update(React.createElement(h.view.root.type,h.props)))
    h.props.today='2026-10-04';act(()=>h.view.update(React.createElement(h.view.root.type,h.props)))
    assert.deepEqual(h.reactions,['happy','all-done','undo'])
  }finally{h.dispose()}
  const ignored=harness([task('one',{dueDate:date})])
  try {
    ignored.props.onToggleTask=()=>{} // no applied state transition
    act(()=>ignored.view.update(React.createElement(ignored.view.root.type,ignored.props)))
    ignored.click('Mark Task one complete');ignored.flushTimers();ignored.flushFrames()
    assert.deepEqual(ignored.reactions,[])
    ignored.props.data={tasks:[task('one',{dueDate:date,completed:true})]}
    act(()=>ignored.view.update(React.createElement(ignored.view.root.type,ignored.props)))
    assert.deepEqual(ignored.reactions,[],'late unrelated load cannot celebrate a refused action')
  }finally{ignored.dispose()}
})

test('Reduce Motion completes immediately without timer, frame, smooth scroll or layout travel', () => {
  const h = harness([task('one',{dueDate:date})],{reduced:true})
  try {
    h.click('Mark Task one complete'); assert.deepEqual(h.toggles,['one']); assert.equal(h.timers.size,0); assert.equal(h.frames.size,0)
    h.click('Previous task'); assert.deepEqual(h.scrolls,[{left:-254,behavior:'auto'}])
    const card = h.view.root.findAllByType('button').find(node=>node.props.className?.startsWith('home-task-card priority'))
    assert.equal(card.props['data-layout'],false)
  } finally { h.dispose() }
})

test('leaving Home cancels pending completion work, including a post-save frame', () => {
  for (const afterTimer of [false,true]) {
    const h = harness([task('one',{dueDate:date})])
    h.click('Mark Task one complete'); if (afterTimer) h.flushTimers()
    h.dispose(); assert.equal(h.timers.size,0); assert.equal(h.frames.size,0)
    assert.deepEqual(h.toggles,afterTimer?['one']:[])
  }
})

test('save feedback/retry remain reachable; long titles are complete DOM text, with separate edit and completion actions', () => {
  const title = 'A very long task title with an unbrokenidentifierthatshouldwrapratherthanbeclipped '.repeat(4)
  const h = harness([task('long',{dueDate:date,title})],{save:'error'})
  try {
    assert.ok(text(h.view.toJSON()).includes('Not saved')); h.click('Retry'); assert.equal(h.retries,1)
    assert.equal(text(h.view.root.findByProps({className:'home-save-state is-error'})), 'Not saved')
    assert.equal(h.view.root.findAllByProps({className:'minimal-home-top'}).length, 1)
    assert.equal(text(h.view.root.findByProps({role:'meter'})),'0%')
    const edit = h.view.root.findByProps({'aria-label':`Edit ${title}`})
    assert.equal(edit.type,'button'); assert.equal(edit.props.type,'button'); assert.ok(text(h.view.toJSON()).includes(title))
    h.click(`Edit ${title}`); assert.deepEqual(h.edits,['long']); assert.deepEqual(h.toggles,[])
  } finally { h.dispose() }
})

test('successful and pending saves are polite announcements without a visible status row or checkmark', () => {
  for (const [save, message] of [['saved','Saved on this device'],['saving','Saving…'],['loading','Checking device storage…']]) {
    const h = harness([], {save})
    try {
      const announcement = h.view.root.findByProps({className:'home-save-announcement'})
      assert.equal(announcement.props.role, 'status'); assert.equal(announcement.props['aria-live'], 'polite')
      assert.equal(text(announcement), message); assert.equal(announcement.findAllByType('svg').length, 0)
      assert.equal(h.view.root.findAllByProps({className:'minimal-home-top'}).length, 0)
      assert.equal(h.view.root.findAllByProps({className:'home-save-retry'}).length, 0)
    } finally { h.dispose() }
  }
  assert.match(css, /home-save-announcement[\s\S]*position: absolute;[\s\S]*width: 1px;[\s\S]*clip-path: inset\(50%\)/)
  assert.match(css, /home-liquid-focus[\s\S]*padding-top: 24px/)
})

test('single/double-digit dates and long months share a dedicated control row, with counts below', () => {
  for (const [today, expected] of [['2026-10-03','October 3'],['2026-10-13','October 13'],['2026-09-30','September 30']]) {
    const h = harness([], {today})
    try {
      const row = h.view.root.findByProps({className:'home-task-heading-row'})
      assert.equal(text(row.findByType('time')), expected); assert.equal(row.findByType('time').props.dateTime, today)
      assert.equal(row.findAllByType('button').length, 4)
      assert.deepEqual(row.findAllByType('button').map(button=>button.props['aria-label']),['Add task','Yesterday and all tasks','Previous task','Next task'])
      assert.equal(row.findAllByProps({className:'home-task-summary'}).length, 0)
      assert.equal(text(h.view.root.findByProps({className:'home-task-summary'})), '0 open · 0 done')
    } finally { h.dispose() }
  }
  assert.match(css, /home-task-heading-row[^}]*align-items: center;[^}]*flex-wrap: wrap/)
  assert.match(css, /home-task-heading h2[^}]*500 26px\/1.2[^}]*lining-nums tabular-nums/)
  assert.match(css, /home-task-heading time \{ font: inherit; white-space: normal/)
  assert.match(css, /home-task-heading h2[^}]*max-width: 100%; overflow-wrap: anywhere/)
  assert.match(css, /home-task-summary[^}]*text-align: start/)
  assert.match(css, /home-liquid-heading \{[^}]*align-items: flex-start/)
  assert.doesNotMatch(css, /Georgia|Times New Roman/)
})

test('fixed Home allocates a bounded task slot and yielding character stage without changing other routes', () => {
  assert.match(css,/container: lumen-home \/ size/)
  assert.match(css,/grid-template-rows: minmax\(0, 1fr\) auto/)
  assert.match(css,/grid-template-rows: auto var\(--home-card-height\)/)
  assert.match(css,/width: 216px;\s*height: 216px/)
  assert.match(css,/home-placeholder-orb[\s\S]*animation: none;\s*transform: none/)
  assert.match(css,/padding-bottom: var\(--lumen-scroll-clearance/)
  assert.match(css,/overflow: hidden;\s*overscroll-behavior: none;\s*touch-action: pan-x pinch-zoom/)
  assert.match(css,/home-task-carousel[^}]*overflow-x: auto; overflow-y: hidden/)
  assert.match(css,/-webkit-line-clamp: 3/)
  assert.match(css,/@container lumen-home-layout \(min-width: 600px\) and \(max-height: 500px\)/)
  assert.match(css,/overflow-wrap: anywhere;\s*white-space: normal/)
  assert.match(css,/home-task-card-edit\.icon-button \{ position: absolute/)
  assert.doesNotMatch(css,/100(?:d|l)?vh|blur\(|backdrop-filter/)
  assert.doesNotMatch(source,/home-day-complete|daily-task-group|onTouchMove|preventDefault/)
  assert.doesNotMatch(source,/liquid-field|liquid-blob|liquidHue|GREEN ZONE|shifts the color|Canvas|WebGL|localStorage|indexedDB/)
  assert.match(source,/Your day, a little clearer/)
})

test('edits and other task updates anchor the currently visible card, without redefining completion order',()=>{
  const h=harness([task('one',{dueDate:date}),task('two',{dueDate:date})])
  try{
    h.carousel.scrollLeft=270
    act(()=>h.view.root.findByProps({role:'group'}).props.onScroll())
    h.props.data={tasks:[task('new',{dueDate:date}),...h.props.data.tasks]}
    act(()=>h.view.update(React.createElement(h.view.root.type,h.props)))
    assert.equal(h.carousel.scrollLeft,524,'same task and relative offset after insertion')
    h.click('Mark Task two complete');h.flushTimers();h.flushFrames()
    assert.equal(h.carousel.scrollLeft,524,'completion retains existing visual slot behavior')
    assert.deepEqual(h.props.data.tasks.map(item=>item.id),['new','one','two'])
  }finally{h.dispose()}
})
