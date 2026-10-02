import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArrowUpRight } from 'lucide-react'
import { transformSync } from 'esbuild'

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/welcome.css', import.meta.url), 'utf8')
const mobile = await readFile(new URL('../src/mobile.css', import.meta.url), 'utf8')
const polish = await readFile(new URL('../src/polish.css', import.meta.url), 'utf8')
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8')
const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')

// Execute the actual pure component, not a second hand-maintained JSX fixture.
// Transpilation is in memory and uses the existing build dependency only.
const source = app.slice(app.indexOf('function WelcomeScreen('), app.indexOf('\nfunction LoginScreen('))
assert.ok(source.startsWith('function WelcomeScreen('))
const { code } = transformSync(source, { loader: 'tsx', jsx: 'transform' })
const WelcomeScreen = new Function('React', 'ArrowUpRight', `${code}\nreturn WelcomeScreen`)(React, ArrowUpRight)

function elements(node) {
  if (!React.isValidElement(node)) return []
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)]
}
function contrast(hexA, hexB) {
  const luminance = (hex) => {
    const [r, g, b] = hex.match(/[a-f0-9]{2}/gi).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return .2126 * r + .7152 * g + .0722 * b
  }
  const values = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

test('welcome has a labelled heading and the exact approved local icon, without old illustrations', () => {
  const html = renderToStaticMarkup(React.createElement(WelcomeScreen, { onContinue() {} }))
  assert.match(html, /<main class="lumen-start" aria-labelledby="lumen-welcome-title">/)
  assert.match(html, /<h1 id="lumen-welcome-title">Lumen<\/h1>/)
  assert.match(html, /src="\.\/lumen-icon-v2-512.png"/)
  assert.match(html, /width="512" height="512" alt=""/)
  assert.match(html, /class="lumen-start-hero" aria-hidden="true"/)
  assert.match(html, /A little space for a clearer day\./)
  assert.doesNotMatch(html, /lumen-start-art|<circle|<ellipse|(?:src|href)="https?:\/\//)
})

test('the single real entry button is immediately enabled and calls the existing Home navigation', () => {
  let entered = 0
  const tree = WelcomeScreen({ onContinue() { entered++ } })
  const buttons = elements(tree).filter((element) => element.type === 'button')
  assert.equal(buttons.length, 1)
  assert.equal(tree.props.onClick, undefined, 'background taps do not enter the app')
  assert.equal(buttons[0].props.type, 'button')
  assert.equal(buttons[0].props.disabled, undefined)
  assert.equal(entered, 0)
  buttons[0].props.onClick()
  assert.equal(entered, 1)
  assert.match(app, /case 'welcome': return <WelcomeScreen onContinue=\{\(\) => navigate\('home'\)\}/)
})

test('welcome artwork is already in the verified offline shell; no new network font or renderer is added', () => {
  const files = JSON.parse(worker.match(/^const FILES = (\[.*\])$/m)[1])
  assert.ok(files.includes('lumen-icon-v2-512.png'))
  assert.ok(!files.some((file) => file.includes('lumen-icon-v2-source')))
  assert.match(css, /font-family: Georgia, 'Times New Roman', serif/)
  assert.doesNotMatch(css, /@import|https?:\/\/|@font-face/)
  assert.doesNotMatch(source, /canvas|requestAnimationFrame|setTimeout|setInterval|useEffect|useState|localStorage|indexedDB/)
})

test('palette, effects and responsive rules remain scoped to welcome', () => {
  assert.match(polish, /--lumen-welcome: #24211e/)
  assert.match(css, /--welcome-cream: #e8d9c7/)
  assert.match(css, /--welcome-sand: #c6ab8d/)
  assert.ok(contrast('e8d9c7', '24211e') >= 4.5)
  assert.ok(contrast('c6ab8d', '24211e') >= 4.5)
  assert.ok(contrast('e8d9c7', '4b4033') >= 4.5, 'cream text remains readable on the lighter glass highlights')
  assert.doesNotMatch(css, /^\s*(?:html|body|:root|button|h1|\.bottom-nav|\.home-screen|\.brain-screen|\.health-screen)\s*[{,]/m)
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) auto auto/)
  assert.match(css, /safe-area-inset-top/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(css, /max-height: 480px\) and \(min-width: 600px/)
  assert.match(main, /import '\.\/mobile.css'[\s\S]*import '\.\/welcome.css'/)
})

test('the accepted full-height iPhone drawing fix and app metadata are preserved', async () => {
  assert.match(mobile, /@media \(display-mode: standalone\)[\s\S]*min-height: 100vh;[\s\S]*min-height: 100lvh/)
  assert.match(mobile, /\.deployed-app-root \{\s*bottom: auto;\s*height: 100vh;\s*height: 100lvh/)
  assert.match(mobile, /html:has\(\.deployed-app-root \.lumen-start\) \{[^}]*color-scheme: dark/)
  assert.doesNotMatch(css, /\.deployed-app-root\s*\{|100dvh|100lvh/)
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  assert.match(html, /viewport-fit=cover/)
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent/)
})

test('entrance motion is finite, opacity/transform-only, and disabled for reduced motion', () => {
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(css, /infinite|animation-iteration-count|will-change/)
  const keyframes = css.match(/@keyframes lumen-welcome-arrive \{\s*from \{([^}]+)\}\s*to \{([^}]+)\}/)
  assert.ok(keyframes)
  for (const declarations of keyframes.slice(1)) {
    for (const property of declarations.matchAll(/([\w-]+):/g)) assert.ok(['opacity', 'transform'].includes(property[1]))
  }
  assert.match(css, /\.lumen-enter-button:focus-visible/)
  assert.match(css, /min-height: 58px/)
})
