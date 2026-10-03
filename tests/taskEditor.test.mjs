import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'
import { extractHomeBaseline } from '../scripts/build-home-baseline.mjs'
import { baselineData, baselineDate } from './fixtures/home-baseline-data.mjs'

const require = createRequire(import.meta.url)
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const code = transformSync(extractHomeBaseline(app), { loader:'tsx',format:'cjs',define:{'import.meta.env.PROD':'true'} }).code
function harness({ edit = false, reduced = false, kind = 'task' } = {}) {
  const old = { document:globalThis.document,window:globalThis.window,HTMLElement:globalThis.HTMLElement }
  const listeners = new Map(), focuses = [], changes = [], closes = [], saves = [], deletes = []
  const doc = { activeElement:null }
  class Element {
    inert = false; isConnected = true
    focus(options) { doc.activeElement=this; focuses.push({target:this,options}) }
    blur() { doc.activeElement=null }
    getClientRects() { return [{}] }
  }
  const opener = new Element(), field = new Element(), close = new Element(), save = new Element()
  const background = new Element(), nav = new Element()
  const sheet = new Element()
  sheet.querySelector = () => field
  sheet.querySelectorAll = () => [close,field,save]
  sheet.contains = node => [close,field,save].includes(node)
  sheet.closest = () => ({querySelectorAll:()=>[background,nav]})
  doc.activeElement=opener
  globalThis.document=doc;globalThis.HTMLElement=Element
  globalThis.window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
  const components=new Map()
  const motion=new Proxy({}, {get:(_,tag)=>{
    if(!components.has(tag))components.set(tag,React.forwardRef((props,ref)=>React.createElement(tag,{...props,ref})))
    return components.get(tag)
  }})
  const module={exports:{}}
  new Function('require','module','exports',code)(name=>name==='framer-motion'?{motion,useReducedMotion:()=>reduced}:name==='./daily'?{}:name==='./components/HomeCharacter'?{}:require(name),module,module.exports)
  const props={sheet:{kind,...edit?{id:'today'}:{}},data:baselineData('many'),taskDraft:{title:'Draft title',projectId:'',dueDate:baselineDate,recurrence:'once'},
    noteDraft:{title:'',body:''},setSheet:value=>closes.push(value),setTaskDraft:value=>changes.push(value),
    saveTask:event=>saves.push(event),onDeleteTask:id=>deletes.push(id)}
  let view
  act(()=>{view=create(React.createElement(module.exports.RenderSheet,props),{createNodeMock:el=>el.props.role==='dialog'?sheet:null})})
  return { view,props,doc,field,opener,background,nav,save,close,focuses,listeners,changes,closes,saves,deletes,
    key(event){act(()=>listeners.get('keydown')(event))},
    dispose(){act(()=>view.unmount());Object.assign(globalThis,old)},
  }
}

test('task editor focuses without page scrolling, holds background inert, and restores opener', () => {
  const h=harness()
  try {
    assert.equal(h.doc.activeElement,h.field)
    assert.deepEqual(h.focuses[0].options,{preventScroll:true})
    assert.equal(h.background.inert,true);assert.equal(h.nav.inert,true)
    const dialog=h.view.root.findByProps({role:'dialog'})
    assert.deepEqual(dialog.props.initial,{opacity:0});assert.deepEqual(dialog.props.animate,{opacity:1})
    assert.equal(dialog.props['aria-modal'],'true')
    const title=h.view.root.findByProps({'data-task-title':true})
    assert.equal(title.props.autoFocus,undefined);assert.equal(title.props.required,true)
  } finally {h.dispose()}
  assert.equal(h.doc.activeElement,h.opener)
  assert.deepEqual(h.focuses.at(-1).options,{preventScroll:true})
  assert.equal(h.background.inert,false);assert.equal(h.nav.inert,false);assert.equal(h.listeners.size,0)
})

test('header and Save stay outside scrollable content; Done retains draft and all project choices', () => {
  const h=harness({edit:true})
  try {
    const content=h.view.root.findByProps({className:'task-editor-content'})
    const footer=h.view.root.findByProps({className:'sheet-footer'})
    assert.equal(footer.parent,content.parent)
    assert.equal(content.findAllByProps({type:'submit'}).length,0)
    assert.equal(content.findByProps({className:'choice-row'}).findAllByType('button').length,25)
    act(()=>content.findByProps({'data-task-title':true}).props.onChange({target:{value:'Updated draft'}}))
    assert.equal(h.changes[0].title,'Updated draft')
    const done=h.view.root.findByProps({className:'task-keyboard-done'})
    let prevented=false;done.props.onPointerDown({preventDefault:()=>{prevented=true}});assert.equal(prevented,true)
    act(()=>done.props.onClick());assert.equal(h.doc.activeElement,null)
    assert.deepEqual(h.closes,[]);assert.deepEqual(h.saves,[])
    act(()=>footer.parent.props.onSubmit('event'));assert.deepEqual(h.saves,['event'])
    // Actions still call the existing handlers; no draft mutation/automatic save.
    act(()=>footer.findAllByType('button').find(node=>node.props.type==='button').props.onClick())
    assert.deepEqual(h.deletes,['today'])
  } finally {h.dispose()}
})

test('focus trap, Escape and reduced motion remain functional', () => {
  const h=harness({reduced:true})
  try {
    assert.deepEqual(h.view.root.findByProps({role:'dialog'}).props.initial,{opacity:1})
    assert.deepEqual(h.view.root.findByProps({role:'dialog'}).props.transition,{duration:0})
    let prevented=0
    h.doc.activeElement=h.save;h.key({key:'Tab',preventDefault:()=>prevented++});assert.equal(h.doc.activeElement,h.close)
    h.key({key:'Tab',shiftKey:true,preventDefault:()=>prevented++});assert.equal(h.doc.activeElement,h.save)
    assert.equal(prevented,2)
    h.key({key:'Escape'});assert.deepEqual(h.closes,[{kind:null}])
  } finally {h.dispose()}
})

test('other editors do not acquire task focus or background-lock behavior', () => {
  const h=harness({kind:'note'})
  try {
    assert.equal(h.doc.activeElement,h.opener)
    assert.equal(h.background.inert,false);assert.equal(h.nav.inert,false)
    assert.equal(h.view.root.findAllByProps({className:'task-editor-content'}).length,0)
    assert.deepEqual(h.view.root.findByProps({role:'dialog'}).props.initial,{y:'100%'})
  } finally {h.dispose()}
})
