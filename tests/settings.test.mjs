import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { transformSync } from 'esbuild'

const source = await readFile(new URL('../src/components/SettingsScreen.tsx', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const nav = await readFile(new URL('../src/components/VisualComponents.tsx', import.meta.url), 'utf8')
const themeSource = await readFile(new URL('../src/theme.ts', import.meta.url), 'utf8')
const require = createRequire(import.meta.url)
const compiled = text => transformSync(text, { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code
const plainText = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(plainText).join('') : node?.children?.map(plainText).join('') ?? ''

function harness({ denied = false } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document }
  const attributes = new Map([['data-lumen-theme', 'dark']])
  const writes = [], counts = { backs: 0, backups: 0, checks: 0, updates: 0, focus: 0, scroll: 0 }
  const storage = { getItem: () => 'dark', setItem(key, value) { if (denied) throw Error('Denied'); writes.push([key, value]) } }
  globalThis.window = Object.assign(new EventTarget(), { localStorage: storage })
  globalThis.document = Object.assign(new EventTarget(), { documentElement: {
    getAttribute: key => attributes.get(key) ?? null, hasAttribute: key => attributes.has(key),
    setAttribute: (key, value) => attributes.set(key, value), style: {},
  }, querySelector: () => ({ setAttribute() {} }) })
  const theme = { exports: {} }
  new Function('require', 'module', 'exports', compiled(themeSource))(require, theme, theme.exports)
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled(source))(name => {
    if (name === '../theme') return theme.exports
    if (name === '../appRelease') return { APP_RELEASE: { version: '0.1.13', build: 'local' } }
    if (name === '../offlineUpdates') return { updateStatusText: { available: 'Update ready to apply', checking: 'Checking for updates…' } }
    if (name === './ScreenLayoutCheck') return { ScreenLayoutCheck: ({ canLeave }) => React.createElement('section', { 'data-can-leave': canLeave }, 'Layout diagnostics') }
    return require(name)
  }, module, module.exports)
  let view
  const props = { onBack: () => counts.backs++, onOpenBackup: () => counts.backups++, saveState: { kind: 'saved' }, offlineShell: { ready: true, online: true, updateAvailable: true, status: 'available', lastCheckedAt: null, checkForUpdates: () => counts.checks++, applyUpdate: () => counts.updates++ } }
  const render = () => React.createElement(module.exports.SettingsScreen, props)
  act(() => { view = create(render(), { createNodeMock: element => element.type === 'h1' ? { focus: () => counts.focus++ } : element.type === 'main' ? { scrollTo: () => counts.scroll++ } : null }) })
  return { view, props, counts, writes, attributes,
    click(text) { const button = view.root.findAllByType('button').find(button => plainText(button) === text || button.props['aria-label'] === text); assert.ok(button, text); act(() => button.props.onClick()) },
    update() { act(() => view.update(render())) },
    dispose() { act(() => view.unmount()); globalThis.window = previous.window; globalThis.document = previous.document },
  }
}

test('Settings owns all sections; nested back resets scroll/focus, and root back returns to its caller', () => {
  const h = harness()
  try {
    assert.equal(plainText(h.view.root.findByType('h1')), 'Settings')
    h.click('Data & backupLocal storage, export and restore'); assert.equal(h.counts.backups, 1)
    for (const [label, title] of [['App & updatesVersion 0.1.13 · check for updates', 'App & updates'], ['DiagnosticsScreen layout and troubleshooting', 'Diagnostics'], ['App identityHome Screen icon and installation', 'App identity']]) {
      h.click(label); assert.equal(plainText(h.view.root.findByType('h1')), title)
      h.click('Back to Settings'); assert.equal(plainText(h.view.root.findByType('h1')), 'Settings')
    }
    assert.equal(h.counts.backs, 0); assert.equal(h.counts.focus, 7); assert.equal(h.counts.scroll, 7)
    h.click('Back to Lumen'); assert.equal(h.counts.backs, 1)
  } finally { h.dispose() }
})

test('native appearance radios update the global theme and only the UI preference', () => {
  const h = harness()
  try {
    const radio = value => h.view.root.findAllByType('input').find(input => input.props.value === value)
    assert.equal(radio('dark').props.checked, true)
    act(() => radio('light').props.onChange())
    assert.equal(radio('light').props.checked, true)
    assert.equal(h.attributes.get('data-lumen-theme'), 'light')
    assert.deepEqual(h.writes, [['lumen-appearance-v1', 'light']])
    assert.equal(h.view.root.findAllByProps({ role: 'status' }).length, 0)
  } finally { h.dispose() }
})

test('failed appearance persistence stays usable and reports the limitation', () => {
  const h = harness({ denied: true })
  try {
    act(() => h.view.root.findAllByType('input').find(input => input.props.value === 'light').props.onChange())
    assert.equal(h.attributes.get('data-lumen-theme'), 'light')
    assert.match(plainText(h.view.root.findByProps({ role: 'status' })), /could not save your choice/)
    assert.deepEqual(h.writes, [])
  } finally { h.dispose() }
})

test('relocated updates refuse unfinished writes at both button and handler boundaries', () => {
  const h = harness()
  try {
    h.click('App & updatesVersion 0.1.13 · check for updates')
    h.click('Check for updates'); assert.equal(h.counts.checks, 1)
    for (const kind of ['loading','saving','error']) {
      h.props.saveState = { kind }; h.update()
      const button = h.view.root.findAllByType('button').find(button => plainText(button) === 'Update Lumen now')
      assert.equal(button.props.disabled, true); act(() => button.props.onClick()); assert.equal(h.counts.updates, 0)
    }
    h.props.saveState = { kind: 'saved' }; h.update(); h.click('Update Lumen now'); assert.equal(h.counts.updates, 1)
    h.props.offlineShell = { ...h.props.offlineShell, status: 'checking' }; h.update()
    assert.equal(h.view.root.findAllByType('button').find(button => plainText(button) === 'Checking…').props.disabled, true)
    h.click('Back to Settings'); h.props.saveState = { kind: 'saving' }; h.update()
    h.click('DiagnosticsScreen layout and troubleshooting'); assert.equal(h.view.root.findByProps({ 'data-can-leave': false }).props['data-can-leave'], false)
  } finally { h.dispose() }
})

test('only the health-journal shortcut moves; data/retry/restore services and originating tab are preserved', () => {
  assert.match(app, /id: 'settings', label: 'Settings', icon: 'settings'/)
  assert.doesNotMatch(app, /id: 'health-journal'|home-backup-link/)
  assert.doesNotMatch(app.match(/function HomeScreen[\s\S]*?function BackupCounts/)[0], /onOpenBackup/)
  for (const id of ['people','inspiration','journal','focus','collections','quick-note']) assert.ok(app.includes(`id: '${id}'`))
  assert.match(nav, /if \(icon === 'settings'\) return <Settings/)
  assert.match(app, /case 'settings': return <SettingsScreen onBack=\{returnToPrimaryScreen\}/)
  assert.match(app, /case 'backup': return <BackupScreen[^\n]+onBack=\{\(\) => navigate\('settings'\)\}/)
  assert.match(app, /returnToPrimaryScreen = \(\) => navigate\(lastPrimaryScreen.current\)/)
  assert.match(app, /lastPrimaryScreen.current = nextScreen/)
  assert.match(app, /onOpenHealthJournal=\{openHealthEditor\}/)
  assert.match(app, /className="home-save-retry"[^>]+onClick=\{onRetrySave\}/)
  assert.match(app, /storage-error-banner[\s\S]*onClick=\{retrySave\}/)
  assert.match(app, /if \(!preview \|\| !replaceSelected \|\| !currentCopySaved\) return/)
  assert.match(app, /await onRestore\(preview.data\)/)
  assert.match(app, /onPortableState\(data\).then\(createBackup\)/)
  assert.doesNotMatch(source, /replaceData|setData|indexedDB|removeItem|localStorage\.clear|caches\.delete/)
})
