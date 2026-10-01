import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
// This identifies the bundle currently running, even while a newer shell waits.
// GitHub supplies the full source SHA; local previews are explicitly labelled.
const release = { version, build: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local' }

export default defineConfig({
  // Relative asset paths work both at the site root and at /<repo>/ on Pages.
  base: './',
  define: { __LUMEN_RELEASE__: JSON.stringify(release) },
  plugins: [react(), {
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
