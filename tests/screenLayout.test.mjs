import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeLayoutBox, formatScreenLayoutReport, iosVersion, readScreenLayout } from '../src/screenLayout.ts'

test('screen report identifies the reported iOS version without including the full user agent', () => {
  assert.equal(iosVersion('Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X)'), '17.3')
  assert.equal(iosVersion('Mozilla/5.0 (iPad; CPU OS 18_7_2 like Mac OS X)'), '18.7.2')
  assert.equal(iosVersion('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Not reported')
})

test('the copyable report preserves conflicting viewport readings rather than inventing a correction', () => {
  const report = { rows: [
    ['App', '0.1.2 / abc1234'], ['Screen', '390 × 844'], ['Window', '390 × 797'],
    ['App top–bottom', '0–797 (height 797)'], ['CSS heights', 'vh=844, dvh=797, lvh=844'],
    ['Safe T/R/B/L', '47px / 0px / 34px / 0px'],
  ] }
  const text = formatScreenLayoutReport(report)
  assert.equal(text, 'Lumen screen layout\nApp: 0.1.2 / abc1234\nScreen: 390 × 844\nWindow: 390 × 797\nApp top–bottom: 0–797 (height 797)\nCSS heights: vh=844, dvh=797, lvh=844\nSafe T/R/B/L: 47px / 0px / 34px / 0px')
  assert.equal(report.rows[3][1], '0–797 (height 797)')
})

function withGlobals(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  try {
    for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { configurable: true, value })
    return callback()
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
}

const rectangle = (width, height, top = 0, left = 0) => ({ width, height, top, left, right: left + width, bottom: top + height })
const boxStyle = (height, position = 'static', overflow = 'hidden') => ({
  height, minHeight: '100%', display: 'block', position,
  overflowX: overflow, overflowY: overflow, transform: 'none', filter: 'none', contain: 'none',
  backgroundColor: 'rgb(250, 247, 242)',
})

test('box descriptions preserve collapsed container heights rather than substituting a viewport', () => {
  const element = { getBoundingClientRect: () => rectangle(390, 0) }
  withGlobals({ getComputedStyle: () => boxStyle('0px') }, () => {
    const description = describeLayoutBox(element)
    assert.match(description, /y 0–0; size 390 × 0; CSS height 0px; min-height 100%/)
    assert.match(description, /display block; position static; overflow hidden\/hidden/)
  })
})

test('box descriptions retain position and potential clipping/compositing clues', () => {
  const element = { getBoundingClientRect: () => rectangle(390, 843.984375, 0.015625) }
  withGlobals({ getComputedStyle: () => ({ ...boxStyle('843.984375px', 'fixed'), transform: 'matrix(1, 0, 0, 1, 0, 9)', contain: 'paint' }) }, () => {
    const description = describeLayoutBox(element)
    assert.match(description, /y 0–844; size 390 × 844/)
    assert.match(description, /CSS height 843.984375px/)
    assert.match(description, /position fixed/)
    assert.match(description, /transform matrix\(1, 0, 0, 1, 0, 9\); filter none; contain paint/)
  })
})

test('missing layout layers are reported without reading computed style', () => {
  withGlobals({ getComputedStyle: () => { throw new Error('Must not read a missing layer') } }, () => {
    assert.equal(describeLayoutBox(null), 'Not present')
  })
})

function withScreenFixture(callback, failOnHtmlStyle = false) {
  const attached = []
  let created = 0
  const html = { clientWidth: 390, clientHeight: 797, scrollHeight: 797, getBoundingClientRect: () => rectangle(390, 844) }
  const body = { getBoundingClientRect: () => rectangle(390, 0), appendChild: (probe) => attached.push(probe) }
  const reactRoot = { getBoundingClientRect: () => rectangle(390, 0) }
  const app = { getBoundingClientRect: () => rectangle(390, 844) }
  const documentFixture = {
    documentElement: html, body,
    getElementById: (id) => id === 'root' ? reactRoot : null,
    querySelector: (selector) => {
      if (selector === '.deployed-app-root') return app
      if (selector === 'meta[name="viewport"]') return { getAttribute: () => 'width=device-width, initial-scale=1.0, viewport-fit=cover' }
      if (selector === 'meta[name="apple-mobile-web-app-status-bar-style"]') return { getAttribute: () => 'black-translucent' }
      return null
    },
    createElement: () => {
      created++
      const probe = {
        style: { cssText: '' }, dataset: {}, setAttribute: () => {},
        getBoundingClientRect: () => {
          const styles = probe.style.cssText
          if (styles.includes('height: 100dvh')) return rectangle(0, 797)
          if (styles.includes('height: 100vh') || styles.includes('height: 100lvh')) return rectangle(0, 844)
          if (styles.includes('inset: 0')) return rectangle(390, 797)
          return rectangle(0, 0)
        },
        remove: () => { const index = attached.indexOf(probe); if (index !== -1) attached.splice(index, 1) },
      }
      return probe
    },
  }
  const computedStyle = (element) => {
    if (element === html && failOnHtmlStyle) throw new Error('Simulated style read failure')
    if (element === app) return boxStyle('843.984375px', 'fixed')
    if (element === html) return boxStyle('844px', 'static', 'visible')
    if (element === body || element === reactRoot) return boxStyle('0px')
    return { paddingTop: '47px', paddingRight: '0px', paddingBottom: '34px', paddingLeft: '0px' }
  }
  return withGlobals({
    document: documentFixture, getComputedStyle: computedStyle,
    navigator: { standalone: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X)' },
    window: { innerWidth: 390, innerHeight: 797, screen: { width: 390, height: 844 }, scrollX: 0, scrollY: 0,
      visualViewport: { width: 390, height: 797, offsetTop: 0, scale: 1 }, matchMedia: () => ({ matches: false }) },
    CSS: { supports: () => true },
  }, () => callback({ attached, get created() { return created } }))
}

test('the snapshot distinguishes the document viewport from actual HTML/body/root boxes and cleans probes', () => {
  withScreenFixture((fixture) => {
    const report = readScreenLayout({ version: '0.1.3', build: '82185d6' })
    const rows = Object.fromEntries(report.rows)
    assert.equal(rows['Document viewport (client)'], '390 × 797')
    assert.match(rows['HTML box'], /size 390 × 844; CSS height 844px/)
    assert.match(rows['Body box'], /size 390 × 0; CSS height 0px/)
    assert.match(rows['React root box'], /size 390 × 0; CSS height 0px/)
    assert.match(rows['App box'], /size 390 × 844; CSS height 843.984375px/)
    assert.equal(rows['CSS heights'], 'vh=844, dvh=797, lvh=844')
    assert.equal(rows['Fixed inset=0'], '0–797 (height 797)')
    assert.equal(rows['Document scroll'], '0, 0; height 797')
    assert.equal(fixture.created, 5)
    assert.deepEqual(fixture.attached, [])
  })
})

test('a failed box/style read removes every diagnostic probe', () => {
  withScreenFixture((fixture) => {
    assert.throws(() => readScreenLayout({ version: '0.1.3', build: '82185d6' }), /Simulated style read failure/)
    assert.equal(fixture.created, 5)
    assert.deepEqual(fixture.attached, [])
  }, true)
})
