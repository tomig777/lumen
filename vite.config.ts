import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { DIAGNOSTIC_FILE, renderLayoutDiagnostic } from './scripts/layout-diagnostic.mjs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
// This identifies the bundle currently running, even while a newer shell waits.
// GitHub supplies the full source SHA; local previews are explicitly labelled.
const release = { version, build: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local' }
const diagnostic = () => renderLayoutDiagnostic(readFileSync(new URL('./tests/fixtures/screen-layout-test.html', import.meta.url), 'utf8'), release)

export default defineConfig({
  // Relative asset paths work both at the site root and at /<repo>/ on Pages.
  base: './',
  define: { __LUMEN_RELEASE__: JSON.stringify(release) },
  plugins: [react(), {
    name: 'lumen-isolated-layout-diagnostic',
    configurePreviewServer(server) {
      // Opt-in local QA controls are never emitted into the published shell.
      if (process.env.LUMEN_THEME_TEST !== '1') return
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' || request.url !== '/screen-layout-test.html?theme-controls=1') return next()
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(readFileSync(new URL('./tests/fixtures/theme-controls.html', import.meta.url), 'utf8'))
      })
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' || new URL(request.url ?? '/', 'http://localhost').pathname !== `/${DIAGNOSTIC_FILE}`) return next()
        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.setHeader('Cache-Control', 'no-cache')
        response.end(diagnostic())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: DIAGNOSTIC_FILE, source: diagnostic() })
    },
  }, {
    name: 'lumen-release-info',
    transformIndexHtml() {
      return [
        { tag: 'meta', attrs: { name: 'lumen-version', content: release.version }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'lumen-build', content: release.build }, injectTo: 'head' },
      ]
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'release.json', source: JSON.stringify(release) })
    },
  }],
})
