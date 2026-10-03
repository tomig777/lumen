import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const compile = source => transformSync(source, {loader:'tsx',format:'cjs',jsx:'transform'}).code
const daily = {exports:{}}
new Function('require','module','exports',compile(await readFile(new URL('../src/daily.ts',import.meta.url),'utf8')))(require,daily,daily.exports)
const source = await readFile(new URL('../src/components/TaskDrawer.tsx',import.meta.url),'utf8')
const css = await readFile(new URL('../src/taskDrawer.css',import.meta.url),'utf8')
const app = await readFile(new URL('../src/App.tsx',import.meta.url),'utf8')
const plain = node => typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):node?.children?.map(plain).join('')??''
const task = (id, fields={}) => ({id,title:`Task ${id}`,priority:'medium',completed:false,...fields})

function harness(items=[], {reduced=false, save='saved'}={}) {
  const old = {window:globalThis.window,document:globalThis.document,HTMLElement:globalThis.HTMLElement}
  const doc={activeElement:null}, listeners=new Map(), events=[]
  class Element {
    inert=false; isConnected=true; scrollTop=0
    focus(options){doc.activeElement=this;events.push(['focus',this.name,options,background.inert])}
    getClientRects(){return [{}]}
  }
  const opener=new Element(), background=new Element(), nav=new Element(), heading=new Element(), close=new Element(), edit=new Element(), list=new Element(), firstTab=new Element(), lastTab=new Element(), dialog=new Element()
  for(const [name,node] of Object.entries({opener,heading,close,edit,list,firstTab,lastTab}))node.name=name
  dialog.closest=()=>({querySelectorAll:()=>[background,nav]})
  dialog.contains=node=>[heading,close,edit,list,firstTab,lastTab].includes(node)
  dialog.querySelectorAll=()=>[close,firstTab,list,edit]
  dialog.querySelector=selector=>selector.includes('"all"')?lastTab:firstTab
  doc.activeElement=opener
  globalThis.document=doc;globalThis.HTMLElement=Element
  globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
  const motion={div:React.forwardRef((props,ref)=>React.createElement('div',{...props,ref}))}
  const module={exports:{}}
  new Function('require','module','exports',compile(source))(name=>name==='framer-motion'?{motion,useReducedMotion:()=>reduced}:name==='../daily'?daily.exports:require(name),module,module.exports)
  const props={tasks:items,projects:[{id:'p',title:'Fixture project'}],today:'2026-10-03',tab:'yesterday',suspended:false,
    onClose:()=>events.push(['close']),onEdit:item=>events.push(['edit',item.id]),onToggle:id=>events.push(['toggle',id]),
    onRetrySave:()=>events.push(['retry']),saveState:{kind:save},onTabChange:tab=>{props.tab=tab;render()}}
  let view
  const render=()=>view.update(React.createElement(module.exports.TaskDrawer,props))
  act(()=>{view=create(React.createElement(module.exports.TaskDrawer,props),{createNodeMock:node=>node.props.role==='dialog'?dialog:node.type==='h2'?heading:node.props.role==='tabpanel'?list:null})})
  return {view,props,events,doc,list,opener,background,nav,heading,close,edit,lastTab,listeners,
    update(){act(render)},click(label){const node=view.root.findAllByType('button').find(node=>node.props['aria-label']===label||plain(node)===label);assert.ok(node,label);act(()=>node.props.onClick())},
    dispose(){act(()=>view.unmount());Object.assign(globalThis,old)},
  }
}

test('Yesterday contains dated completions only, current titles and no row actions',()=>{
  const items=[task('yesterday',{title:'Renamed current title',projectId:'p',completedOn:[{date:'2026-10-02',at:'noon'}]}),task('legacy',{completed:true}),task('today',{completedOn:[{date:'2026-10-03',at:'noon'}]})]
  const h=harness(items)
  try{
    assert.equal(h.view.root.findByType('time').props.dateTime,'2026-10-02')
    assert.equal(plain(h.view.root.findByType('time')),'October 2, 2026')
    const rows=h.view.root.findByProps({role:'tabpanel'})
    assert.equal(rows.findAllByType('li').length,1);assert.equal(rows.findAllByType('button').length,0)
    assert.match(plain(rows),/Renamed current titleFixture project/)
    assert.match(plain(h.view.toJSON()),/Recorded completions only. Titles reflect your current tasks./)
    for(const date of ['2027-01-01','2026-03-30','2026-10-26']){
      h.props.today=date;h.update()
      assert.equal(h.view.root.findByType('time').props.dateTime,daily.exports.previousLocalDate(date))
      assert.match(plain(h.view.toJSON()),/No recorded completions yesterday/)
    }
    assert.equal(h.events.filter(event=>['edit','toggle'].includes(event[0])).length,0)
  }finally{h.dispose()}
})

test('All tasks preserves every task and limits actions to meaningful current-day completions',()=>{
  const items=[task('today',{dueDate:'2026-10-03'}),task('late',{dueDate:'2026-10-02'}),task('loose'),task('future',{dueDate:'2026-10-04'}),task('weekend',{recurrence:'weekdays'}),task('legacy',{completed:true})]
  const h=harness(items)
  try{
    h.click('All tasks');const panel=h.view.root.findByProps({role:'tabpanel'})
    assert.equal(panel.findAllByType('li').length,items.length)
    for(const item of items)assert.equal(panel.findAllByProps({'aria-label':`Edit ${item.title}`}).length,1)
    for(const id of ['future','weekend'])assert.equal(panel.findAllByProps({'aria-label':`Complete Task ${id}`}).length,0)
    h.click('Complete Task late');h.click('Undo completion of Task legacy');h.click('Edit Task future')
    assert.deepEqual(h.events.filter(event=>['edit','toggle'].includes(event[0])),[['toggle','late'],['toggle','legacy'],['edit','future']])
    assert.equal(h.view.root.findByProps({'data-task-tab':'all'}).props['aria-selected'],true)
    h.props.tasks=[];h.update();assert.match(plain(h.view.toJSON()),/No tasks yet/)
  }finally{h.dispose()}
})

test('editor suspension preserves tab, independent scroll and focus, without competing modal listeners',()=>{
  const h=harness([task('one')])
  try{
    assert.equal(h.background.inert,true);assert.equal(h.doc.activeElement,h.heading)
    h.click('All tasks');h.list.scrollTop=173
    act(()=>h.view.root.findByProps({role:'tabpanel'}).props.onScroll())
    act(()=>h.view.root.findByProps({role:'dialog'}).props.onFocusCapture({target:h.edit}))
    h.props.suspended=true;h.update()
    assert.equal(h.background.inert,false);assert.equal(h.listeners.size,0)
    assert.deepEqual(h.view.root.findByProps({className:'task-drawer-layer'}).props.style,{display:'none'})
    h.list.scrollTop=0;h.props.suspended=false;h.update()
    assert.equal(h.props.tab,'all');assert.equal(h.list.scrollTop,173);assert.equal(h.doc.activeElement,h.edit)
    assert.equal(h.background.inert,true);assert.equal(h.listeners.size,1)
    h.click('Yesterday');assert.equal(h.list.scrollTop,0)
    h.click('All tasks');assert.equal(h.list.scrollTop,173)
  }finally{h.dispose()}
  assert.equal(h.background.inert,false);assert.equal(h.nav.inert,false);assert.equal(h.listeners.size,0)
  assert.equal(h.doc.activeElement,h.opener)
  assert.equal(h.events.at(-1)[3],false,'opener restored after background unlock')
})

test('keyboard tab navigation, focus trap, Escape and Reduce Motion are usable',()=>{
  const h=harness([],{reduced:true,save:'error'})
  try{
    const dialog=h.view.root.findByProps({role:'dialog'})
    assert.equal(dialog.props.initial,false);assert.equal(dialog.props.transition.duration,0)
    let prevented=0
    act(()=>h.view.root.findByProps({'data-task-tab':'yesterday'}).props.onKeyDown({key:'ArrowRight',preventDefault:()=>prevented++}))
    assert.equal(h.props.tab,'all');assert.equal(h.doc.activeElement,h.lastTab)
    h.doc.activeElement=h.edit;act(()=>h.listeners.get('keydown')({key:'Tab',preventDefault:()=>prevented++}))
    assert.equal(h.doc.activeElement,h.close)
    act(()=>h.listeners.get('keydown')({key:'Tab',shiftKey:true,preventDefault:()=>prevented++}));assert.equal(h.doc.activeElement,h.edit)
    h.click('Retry');assert.ok(h.events.some(event=>event[0]==='retry'))
    act(()=>h.listeners.get('keydown')({key:'Escape',preventDefault:()=>prevented++}));assert.ok(h.events.some(event=>event[0]==='close'))
    assert.equal(prevented,4)
  }finally{h.dispose()}
})

test('regrouping or removing a focused row keeps focus inside without scrolling',()=>{
  const h=harness([task('one')])
  try{
    h.click('All tasks');h.list.scrollTop=173
    act(()=>h.view.root.findByProps({role:'dialog'}).props.onFocusCapture({target:h.edit}))
    h.edit.isConnected=false;h.doc.activeElement=null;h.props.tasks=[];h.update()
    assert.equal(h.doc.activeElement,h.heading)
    assert.equal(h.list.scrollTop,173)
    assert.equal(h.events.at(-1)[2].preventScroll,true)
    h.props.suspended=true;h.update()
    act(()=>h.view.root.findByProps({role:'dialog'}).props.onFocusCapture({target:h.edit}))
    h.doc.activeElement=h.opener;h.props.tasks=[task('two')];h.update()
    assert.equal(h.doc.activeElement,h.opener,'hidden drawer must not steal editor focus')
  }finally{h.dispose()}
})

test('drawer is app-owned outside route scrollers and suspends the existing character/editor flow',()=>{
  assert.match(app,/onOpenTaskHistory=\{\(\) => setTaskDrawer\('yesterday'\)\}/)
  assert.match(app,/characterActive=\{screen === 'home' && !sheet.kind && !selectedImage && !taskDrawer\}/)
  assert.match(app,/suspended=\{!!sheet.kind\}/)
  assert.match(app,/onEdit=\{openTaskEditor\} onToggle=\{toggleTaskFromDrawer\}/)
  assert.match(app,/\{renderTaskDrawer\(mirror\)\}/)
  assert.match(css,/task-drawer-list[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain/)
  assert.match(css,/html\[data-lumen-theme\] \.phone-app \.task-drawer-tabs button\[aria-selected='true'\][^}]*color: var\(--lumen-on-selection\); background: var\(--lumen-selection\)/)
  assert.doesNotMatch(css,/100(?:d|l)?vh|filter:|--lumen-glint|::before|::after/)
  assert.doesNotMatch(source,/localStorage|indexedDB|setInterval|setTimeout|Canvas/)
})
