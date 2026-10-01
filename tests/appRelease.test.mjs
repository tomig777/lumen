import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'esbuild'

test('the running bundle, HTML, and offline metadata share one release identity', async () => {
  const release = JSON.parse(await readFile(new URL('../dist/release.json', import.meta.url), 'utf8'))
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  assert.equal(release.version, pkg.version)
  assert.match(release.build, /^(local|[a-f0-9]{7})$/)
  if (process.env.GITHUB_SHA) assert.equal(release.build, process.env.GITHUB_SHA.slice(0, 7))
  const metas = [...html.matchAll(/<meta name="lumen-(version|build)" content="([^"]+)"/g)]
  assert.equal(metas.length, 2)
  for (const [, key, value] of metas) assert.equal(value, release[key])
  const entry = html.match(/src="\.\/(assets\/[^\"]+)"/)[1]
  const js = await readFile(new URL(`../dist/${entry}`, import.meta.url), 'utf8')
  // Vite folds the local-only display branch and can remove its unused build field.
  const displayedBuild = release.build === 'local' ? 'Local preview' : release.build
  assert.ok(js.includes(JSON.stringify(release.version)) && js.includes(JSON.stringify(displayedBuild)), 'running code embeds the displayed release values')
  const bundled = await build({ entryPoints: [fileURLToPath(new URL('../src/appRelease.ts', import.meta.url))],
    bundle: true, format: 'esm', platform: 'node', write: false, define: { __LUMEN_RELEASE__: JSON.stringify(release) } })
  const { APP_RELEASE } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString('base64')}`)
  assert.deepEqual(APP_RELEASE, release, 'runtime identity is compile-time data, not a fetched latest version')
  const files = JSON.parse(worker.match(/^const FILES = (\[[^\n]+\])/m)[1])
  assert.ok(files.includes('release.json'), 'release metadata is available in the same offline shell')
})
