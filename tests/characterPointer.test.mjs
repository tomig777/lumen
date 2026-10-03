import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformSync } from 'esbuild'
import { test } from 'node:test'

async function load(path) {
  const module = { exports: {} }
  const source = await readFile(new URL(path, import.meta.url), 'utf8')
  new Function('module', 'exports', transformSync(source, {loader:'ts',format:'cjs'}).code)(module, module.exports)
  return module.exports
}
const {pointerGaze, bindHomeGaze, createGazeInput} = await load('../src/components/characterPointer.ts')
const {createIdleEyes} = await load('../src/components/characterAnimation.ts')

test('gaze maps relative to sphere center with bounded curved movement and inverted screen Y', () => {
  for(const size of [80,216,300]) {
    const rect={left:40,top:120,width:size,height:size}
    const center=pointerGaze(40+size/2,120+size/2,rect)
    assert.ok(center.x===0 && center.y===0)
    for(const x of [-10000,0,200,10000]) for(const y of [-10000,0,600,10000]) {
      const pose=pointerGaze(x,y,rect)
      assert.ok(Math.abs(pose.x)<=.22 && Math.abs(pose.y)<=.14)
    }
    assert.ok(pointerGaze(400,0,rect).x>0 && pointerGaze(400,0,rect).y>0)
  }
})

test('direct gaze wins over idle, coalesces input and stops drawing under a stationary finger', () => {
  let now=0, draws=0, pose, next=0
  const timers=new Map()
  const controller=createIdleEyes({now:()=>now,random:()=>.5,setTimer:(callback,delay)=>{
    const id=++next;timers.set(id,{callback,at:now+delay});return id
  },clearTimer:id=>timers.delete(id),requestDraw:()=>draws++,apply:value=>{pose=value}})
  controller.start();controller.frame()
  const stale=[...timers.values()].map(timer=>timer.callback)
  const before=draws
  for(let i=1;i<=100;i++)controller.follow(i/100, -i/100)
  assert.equal(draws,before+1);assert.equal(timers.size,0)
  stale.forEach(callback=>callback());assert.equal(draws,before+1)
  now+=80;controller.frame();assert.ok(pose.x>0 && pose.x<.22)
  now+=80;controller.frame();assert.deepEqual(pose,{x:.22,y:-.14,openness:1})
  const settled=draws
  for(let i=0;i<100;i++){controller.follow(.22,-.14);controller.frame()}
  assert.equal(draws,settled);assert.equal(timers.size,0)
  controller.follow(NaN,Infinity);assert.equal(draws,settled)
  controller.release();now+=210;controller.frame();assert.ok(pose.x>0 && pose.x<.22)
  now+=210;controller.frame();assert.deepEqual(pose,{x:0,y:0,openness:1})
  assert.equal(timers.size,2)
  assert.ok([...timers.values()].every(timer=>timer.at>now+1800),'fresh idle delays, no catch-up')
  controller.follow(-.22,.14);controller.stop()
  const stopped=draws;controller.follow(.2,.1);controller.release();controller.frame()
  assert.equal(draws,stopped);assert.equal(timers.size,0)
  controller.start();controller.frame();assert.deepEqual(pose,{x:0,y:0,openness:1})
  controller.stop()
})

class Target extends EventTarget {
  listeners=new Set()
  addEventListener(type,fn){this.listeners.add(fn);super.addEventListener(type,fn)}
  removeEventListener(type,fn){this.listeners.delete(fn);super.removeEventListener(type,fn)}
}
function pointer(type, changes={}) {
  return Object.assign(new Event(type,{cancelable:true}),{pointerId:1,isPrimary:true,button:0,clientX:200,clientY:250,...changes})
}

test('background-only capture excludes controls, cards, secondary touches and native edges; all exits clean up', () => {
  const oldWindow=globalThis.window,oldDocument=globalThis.document
  const window=new Target();window.innerWidth=390;window.innerHeight=844
  const document=new Target();document.hidden=false
  const root=new Target(),poses=[],captures=new Set()
  const background={closest:selector=>selector==='.home-liquid-focus'?background:null}
  const control={closest:()=>control}
  let hit=background
  document.elementFromPoint=()=>hit
  root.contains=target=>target===background||target===control
  root.setPointerCapture=id=>captures.add(id)
  root.hasPointerCapture=id=>captures.has(id)
  root.releasePointerCapture=id=>captures.delete(id)
  const host={getBoundingClientRect:()=>({left:87,top:180,width:216,height:216})}
  globalThis.window=window;globalThis.document=document
  // EventTarget supplies its own target; model the actual background target.
  const send=(type,changes={},target=background)=>{
    const event=pointer(type,changes);Object.defineProperty(event,'target',{value:target})
    root.dispatchEvent(event);assert.equal(event.defaultPrevented,false)
  }
  let cleanup
  try {
    cleanup=bindHomeGaze(root,host,pose=>poses.push(pose))
    for(const changes of [{isPrimary:false},{button:2},{clientX:10},{clientX:385},{clientY:30},{clientY:820}])send('pointerdown',changes)
    send('pointerdown',{},control);assert.equal(poses.length,0)
    send('pointerdown');assert.equal(captures.size,1)
    send('pointerdown',{pointerId:2});send('pointermove',{pointerId:2});assert.equal(poses.length,1)
    send('pointermove',{clientX:260});assert.equal(poses.length,2)
    hit=control;send('pointermove');assert.equal(poses.at(-1),null);assert.equal(captures.size,0)
    hit=background
    for(const exit of ['pointerup','pointercancel','lostpointercapture']) {
      send('pointerdown');send(exit);assert.equal(poses.at(-1),null);assert.equal(captures.size,0)
    }
    for(const exit of ['blur','resize']) {
      send('pointerdown');window.dispatchEvent(new Event(exit));assert.equal(poses.at(-1),null)
    }
    send('pointerdown');document.hidden=true;document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(poses.at(-1),null);const hiddenCount=poses.length;send('pointerdown');assert.equal(poses.length,hiddenCount)
    document.hidden=false;send('pointerdown');cleanup();cleanup=null
    assert.equal(poses.at(-1),null);assert.equal(captures.size,0)
    assert.equal(root.listeners.size,0);assert.equal(document.listeners.size,0);assert.equal(window.listeners.size,0)
    const disposed=poses.length;send('pointermove');assert.equal(poses.length,disposed)
  } finally {cleanup?.();globalThis.window=oldWindow;globalThis.document=oldDocument}
})

test('input channel retains no gesture for a newly resumed scene', () => {
  const input=createGazeInput(),poses=[]
  input.emit({x:.2,y:.1})
  const unsubscribe=input.subscribe(pose=>poses.push(pose));assert.equal(poses.length,0)
  input.emit({x:.1,y:0});input.emit(null);assert.equal(poses.length,2)
  unsubscribe();input.emit({x:.2,y:.1});assert.equal(poses.length,2)
})
