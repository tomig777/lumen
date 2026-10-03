import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformSync } from 'esbuild'
import { test } from 'node:test'

const module={exports:{}}
new Function('module','exports',transformSync(await readFile(new URL('../src/components/characterAnimation.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code)(module,module.exports)

function harness(session={lastGreetingAt:-Infinity,lastReactionAt:-Infinity}) {
  let now=0,next=0,dirty=false,draws=0,pose
  const timers=new Map(),poses=[]
  const controller=module.exports.createIdleEyes({now:()=>now,random:()=>.5,
    setTimer(callback,delay){const id=++next;timers.set(id,{callback,at:now+delay});return id},
    clearTimer:id=>timers.delete(id),requestDraw:()=>{dirty=true},apply:value=>{pose=value;poses.push({...value})}},
    {personality:true,session})
  const frame=()=>{dirty=false;draws++;controller.frame()}
  return {controller,timers,session,poses,get pose(){return pose},get draws(){return draws},get now(){return now},
    tick(ms){const end=now+ms;while(now<end){now=Math.min(end,now+16)
      for(const [id,timer] of [...timers].sort((a,b)=>a[1].at-b[1].at))if(timer.at<=now&&timers.has(id)){timers.delete(id);timer.callback()}
      if(dirty)frame()
    }},frame,
    jump(ms){now+=ms},
  }
}

test('greeting double blink is finite and survives resume/route-controller replacement with a 60s cooldown',()=>{
  const h=harness();h.controller.start();h.tick(80);assert.ok(Math.abs(h.pose.openness-.08)<1e-9)
  h.tick(120);assert.equal(h.pose.openness,1)
  h.tick(160);assert.ok(Math.abs(h.pose.openness-.08)<1e-9)
  h.tick(120);assert.equal(h.pose.openness,1)
  const settled=h.draws;h.tick(500);assert.equal(h.draws,settled)
  h.controller.stop();h.controller.start();h.tick(80);assert.equal(h.pose.openness,1,'quick overlay return has no greeting')
  h.controller.stop()
  const route=harness(h.session);route.jump(2000);route.controller.start();route.tick(80)
  assert.equal(route.pose.openness,1,'new route controller shares cooldown, not an expression queue')
  route.controller.stop();route.jump(60000);route.controller.start();route.tick(80)
  assert.ok(Math.abs(route.pose.openness-.08)<1e-9)
  route.controller.stop();assert.equal(route.timers.size,0)
})

test('sleep follows 40s visible inactivity, holds without frames, blinks slowly and wakes gently on activity',()=>{
  const h=harness();h.controller.start();h.tick(39000);h.controller.activity();h.tick(1000)
  assert.ok(h.pose.openness>.48,'interaction postponed sleep deadline')
  h.tick(39700);assert.equal(h.pose.openness,.48)
  const settled=h.draws;h.tick(2000);assert.equal(h.draws,settled,'half lids do not redraw continuously')
  assert.equal(h.timers.size,1,'only slow sleepy blink remains')
  const sleepyPoses=h.poses.length
  h.tick(8200);assert.ok(h.poses.slice(sleepyPoses).some(p=>p.openness<.2));h.tick(300)
  assert.equal(h.pose.openness,.48)
  h.controller.activity();h.tick(140);assert.ok(h.pose.openness>.48&&h.pose.openness<1)
  h.tick(140);assert.equal(h.pose.openness,1);assert.equal(h.timers.size,3)
  h.controller.stop()
})

test('an expired greeting cannot overwrite a newer blink on a delayed renderer draw',()=>{
  const h=harness();h.controller.start();h.frame()
  const blink=[...h.timers.values()].sort((a,b)=>a.at-b.at)[0]
  h.jump(blink.at);blink.callback();h.jump(80);h.frame()
  assert.ok(Math.abs(h.pose.openness-.08)<1e-9)
  h.controller.stop()
})

test('touch wakes sleepy eyes smoothly, owns gaze, drops happy reactions and settles without timers',()=>{
  const h=harness();h.controller.start();h.tick(40600);assert.equal(h.pose.openness,.48)
  h.controller.follow(.2,-.1);assert.equal(h.pose.openness,.48,'no immediate lid snap')
  h.tick(140);assert.ok(h.pose.openness>.48&&h.pose.openness<1)
  h.controller.react('all-done');h.tick(500);assert.deepEqual(h.pose,{x:.2,y:-.1,openness:1})
  assert.equal(h.timers.size,0)
  const settled=h.draws;h.tick(3000);assert.equal(h.draws,settled)
  h.controller.release();h.tick(420);assert.deepEqual(h.pose,{x:0,y:0,openness:1})
  assert.equal(h.timers.size,3);h.tick(1000);assert.equal(h.pose.openness,1,'no queued delight after release')
  h.controller.stop()
})

test('happy is rate-limited, all-done upgrades it once, holds on a timer and never queues repetitions',()=>{
  const h=harness();h.controller.start();h.tick(600);h.controller.react('happy');h.tick(160)
  assert.equal(h.pose.openness,.36)
  h.tick(300);const held=h.draws;h.tick(200);assert.equal(h.draws,held,'happy hold is not continuous rendering')
  h.controller.react('happy');assert.equal(h.session.lastReactionAt,600)
  h.controller.react('all-done');h.tick(160);assert.equal(h.pose.openness,.28)
  const upgraded=h.session.lastReactionAt;h.controller.react('all-done');assert.equal(h.session.lastReactionAt,upgraded)
  h.tick(1360);assert.equal(h.pose.openness,1);assert.equal(h.timers.size,3)
  h.controller.stop()
})

test('undo cancels delight without triggering a new expression; direct touch also supersedes happy/greeting',()=>{
  const h=harness();h.controller.start();h.controller.follow(.1,.1);h.tick(500)
  assert.deepEqual(h.pose,{x:.1,y:.1,openness:1})
  h.controller.release();h.tick(500);h.controller.react('happy');h.tick(160)
  assert.equal(h.pose.openness,.36)
  h.controller.react('undo');h.tick(140);assert.ok(h.pose.openness>.36&&h.pose.openness<1)
  h.tick(300);assert.equal(h.pose.openness,1)
  h.tick(1500);h.controller.react('all-done');h.tick(160);h.controller.follow(-.2,.1);h.tick(500)
  assert.deepEqual(h.pose,{x:-.2,y:.1,openness:1});assert.equal(h.timers.size,0)
  h.controller.stop()
})

test('suspension cancels every personality timer and stale callback; resume has fresh inactivity time',()=>{
  const h=harness();h.controller.start();h.tick(40600)
  const stale=[...h.timers.values()].map(timer=>timer.callback)
  h.controller.stop();assert.equal(h.timers.size,0);assert.deepEqual(h.pose,{x:0,y:0,openness:1})
  h.jump(120000);h.controller.react('happy');h.controller.activity();stale.forEach(fn=>fn())
  assert.equal(h.timers.size,0)
  h.controller.start();stale.forEach(fn=>fn());h.tick(600)
  assert.equal(h.pose.openness,1);assert.equal(h.timers.size,3)
  assert.ok([...h.timers.values()].some(timer=>timer.at>=h.now+39000))
  h.controller.react('happy');h.tick(500);const holdStale=[...h.timers.values()].map(timer=>timer.callback)
  h.controller.stop();holdStale.forEach(fn=>fn());assert.equal(h.timers.size,0)
})
