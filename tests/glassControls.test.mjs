import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const require = createRequire(import.meta.url)
const navSource = await readFile(new URL('../src/components/VisualComponents.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/glass.css', import.meta.url), 'utf8')
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const { code } = transformSync(navSource, { loader: 'tsx', format: 'cjs', jsx: 'transform' })

function harness(reduced = false) {
  const previous = globalThis.window
  const target = new EventTarget()
  let listeners = 0, focused = 0
  const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target)
  target.addEventListener = (name, fn) => { listeners++; add(name, fn) }
  target.removeEventListener = (name, fn) => { listeners--; remove(name, fn) }
  globalThis.window = target
  const motions = new Map()
  const motion = new Proxy({}, { get: (_, tag) => {
    if (!motions.has(tag)) motions.set(tag, React.forwardRef(({ initial, animate, exit, transition, layoutId, ...props }, ref) =>
      React.createElement(tag, { ...props, ref, 'data-motion': { initial, animate, exit, transition, layoutId } })))
    return motions.get(tag)
  } })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'framer-motion') return { motion, AnimatePresence: ({ children }) => children, useReducedMotion: () => reduced }
    if (name === './StoredImage') return { StoredImage: () => null }
    if (name.endsWith('.png')) return { default: 'test.png' }
    if (name === '../theme') return { THEME_EVENT: 'lumen-theme-change' }
    return require(name)
  }, module, module.exports)
  const selected = [], changed = []
  const props = { active: 'brain', onChange: tab => changed.push(tab), quickActions: [
    { id: 'settings', label: 'Settings', icon: 'settings', onSelect: () => selected.push('settings') },
    { id: 'quick-note', label: 'Quick note', icon: 'quick-note', onSelect: () => selected.push('quick-note') },
  ] }
  let view
  act(() => { view = create(React.createElement(module.exports.BottomNav, props), {
    createNodeMock: element => element.type === 'nav' ? { contains: () => false } : element.props.className === 'nav-capture' ? { focus: () => focused++ } : null,
  }) })
  const capture = () => view.root.findByProps({ className: 'nav-capture' })
  return { view, target, selected, changed, capture,
    get listeners() { return listeners }, get focused() { return focused },
    toggle() { act(() => capture().props.onClick()) },
    dispose() { act(() => view.unmount()); globalThis.window = previous },
  }
}

test('glass navigation keeps four native buttons, one selected bubble, and routes/menu semantics', () => {
  const h = harness()
  try {
    const tabs = h.view.root.findAllByType('button').filter(button => button.props['aria-label'] && button.props.className.startsWith('nav-item'))
    assert.deepEqual(tabs.map(button => button.props['aria-label']), ['Home', 'Brain', 'Projects', 'Health'])
    assert.equal(tabs.filter(button => button.props['aria-current'] === 'page').length, 1)
    assert.equal(tabs[1].props['aria-current'], 'page')
    assert.equal(h.view.root.findAllByType('span').filter(node => node.props.className === 'nav-active-bubble').length, 1)
    for (const button of tabs) assert.equal(button.props.type, 'button')
    h.toggle(); assert.equal(h.capture().props['aria-expanded'], true); assert.equal(h.listeners, 2)
    const menu = h.view.root.findByProps({ className: 'nav-action-menu' })
    assert.equal(h.capture().props['aria-controls'], menu.props.id)
    const action = h.view.root.findAllByType('button').find(button => button.props.className === 'nav-action-item ')
    assert.equal(action.props.type, 'button'); act(() => action.props.onClick())
    assert.deepEqual(h.selected, ['settings']); assert.equal(h.capture().props['aria-expanded'], false)
    assert.equal(h.listeners, 0)
    h.toggle(); act(() => tabs[2].props.onClick()); assert.deepEqual(h.changed, ['projects'])
    assert.equal(h.capture().props['aria-expanded'], false)
  } finally { h.dispose() }
})

test('Escape returns focus to +; outside taps and unmount dismiss/clean up menu listeners', () => {
  const h = harness()
  try {
    h.toggle(); const escape = new Event('keydown'); escape.key = 'Escape'
    act(() => h.target.dispatchEvent(escape)); assert.equal(h.focused, 1); assert.equal(h.listeners, 0)
    h.toggle(); act(() => h.target.dispatchEvent(new Event('pointerdown')))
    assert.equal(h.capture().props['aria-expanded'], false); assert.equal(h.listeners, 0)
    h.toggle(); assert.equal(h.listeners, 2)
  } finally { h.dispose() }
  assert.equal(h.listeners, 0)
})

test('Reduce Motion skips bubble travel, menu transforms/stagger and animated + rotation', () => {
  const h = harness(true)
  try {
    h.toggle()
    const elements = h.view.root.findAll(node => typeof node.type === 'string' && node.props['data-motion'])
    for (const node of elements) {
      const state = node.props['data-motion']
      if (node.props.className === 'nav-active-bubble') {
        assert.equal(state.layoutId, undefined); assert.equal(state.transition.duration, 0)
      }
      if (node.props.className?.startsWith('nav-action')) {
        assert.equal(state.initial, false); assert.equal(state.transition.duration, 0); assert.equal(state.transition.delay, undefined)
        assert.deepEqual(state.exit, { opacity: 0 })
      }
      if (node.props.className === 'nav-icon-wrap') assert.deepEqual(state.animate, { y: 0 })
      if (node.props.className === 'nav-capture-icon') assert.equal(state.transition.duration, 0)
    }
    assert.equal(h.capture().props['data-motion'], undefined, 'the glass capsule itself never rotates')
  } finally { h.dispose() }
})

const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))
const luminance = channels => channels.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4 }).reduce((sum, value, index) => sum + value * [.2126,.7152,.0722][index], 0)
const ratio = (a,b) => { const x = luminance(a), y = luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
const variable = (block, name) => block.match(new RegExp(`--lumen-glass-${name}: (#[a-f\\d]+);`, 'i'))[1]

test('actual glass gradients and hover composites keep readable labels and selected icons in both themes', () => {
  const blocks = [css.split("html[data-lumen-theme='light']")[0], css.split("html[data-lumen-theme='light']")[1].split('/*')[0]]
  const foregrounds = ['#e8d9c7', '#24211e'], selected = ['#24211e', '#f7f3ed']
  const inactive = ['#c6ab8d', '#65574b'], focus = ['#e8d9c7', '#85521f']
  blocks.forEach((block, mode) => {
    for (const [a,b] of [['top','bottom'],['quiet-top','quiet-bottom'],['selected-top','selected-bottom']]) {
      const start = rgb(variable(block,a)), end = rgb(variable(block,b))
      for (let step = 0; step <= 100; step++) {
        const base = start.map((value,index) => value + (end[index]-value)*step/100)
        const isSelected = a.startsWith('selected')
        assert.ok(ratio(rgb(isSelected ? selected[mode] : foregrounds[mode]), base) >= (isSelected ? 3 : 4.5))
        if (a === 'quiet-top') assert.ok(ratio(rgb(inactive[mode]), base) >= 4.5, 'inactive navigation icons retain contrast')
        if (!isSelected) assert.ok(ratio(rgb(focus[mode]), base) >= 3, 'keyboard focus remains distinct from glass')
        if (!isSelected) {
          const tint = mode ? [255,255,255] : [255,237,208], alpha = mode ? .16 : .045
          const composite = base.map((value,index) => tint[index]*alpha+value*(1-alpha))
          assert.ok(ratio(rgb(foregrounds[mode]), composite) >= 4.5, 'actual hover overlay composited over every gradient sample')
        }
      }
    }
  })
})

test('shared glass has no decorative edge lights; preserves welcome separation and shell geometry', () => {
  assert.ok(main.indexOf("'./glass.css'") > main.indexOf("'./settings.css'"))
  assert.match(css, /min-width: 44px;[\s\S]*min-height: 44px/)
  assert.doesNotMatch(css, /::before|::after|--lumen-glow|--lumen-glint/)
  assert.match(css, /backdrop-filter: none/)
  assert.match(css, /\.bottom-nav \.nav-capture \{ position: absolute; transform: none; \}/)
  assert.match(css, /:disabled[\s\S]*opacity: 1/)
  assert.match(css, /:focus-visible[\s\S]*outline: 2px solid var\(--lumen-focus\)/)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*transition: none; scale: 1/)
  assert.doesNotMatch(css, /100(?:d|l)?vh|safe-area-inset|\.lumen-enter-button|\.lumen-start|blur\(|canvas|inset 0/)
  assert.doesNotMatch(navSource.slice(navSource.indexOf('export function BottomNav'),navSource.indexOf('export function TreeVisual')), /<canvas|Canvas|WebGL/)
})
