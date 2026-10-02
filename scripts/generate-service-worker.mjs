import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { DIAGNOSTIC_FILE } from './layout-diagnostic.mjs'

const output = new URL('../dist/', import.meta.url)
const root = decodeURIComponent(output.pathname).replace(/^\/([A-Za-z]:)/, '$1')

async function filesIn(folder) {
  const entries = await readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(folder, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  }))
  return nested.flat()
}

const files = (await filesIn(root)).filter((path) => !path.endsWith(`${sep}sw.js`)).sort()
const paths = files.map((path) => relative(root, path).split(sep).join('/'))
if (!paths.includes('index.html') || !paths.includes(DIAGNOSTIC_FILE) || !paths.some((path) => path.startsWith('assets/'))) {
  throw new Error('Refusing to generate an incomplete offline shell.')
}
const indexHtml = await readFile(join(root, 'index.html'), 'utf8')
const entryAssets = [...indexHtml.matchAll(/(?:src|href)="\.\/(assets\/[^\"]+)"/g)].map((match) => match[1])
if (!entryAssets.length || entryAssets.some((path) => !paths.includes(path))) {
  throw new Error('The HTML entry point does not match the generated assets.')
}
const hash = createHash('sha256')
for (const path of files) {
  hash.update(relative(root, path))
  hash.update(await readFile(path))
}
const cacheName = `lumen-shell-${hash.digest('hex').slice(0, 16)}`
const release = JSON.parse(await readFile(join(root, 'release.json'), 'utf8'))
const diagnosticIdentity = [
  `name="lumen-diagnostic-version" content="${release.version}"`,
  `name="lumen-diagnostic-build" content="${release.build}"`,
]
const diagnosticHtml = await readFile(join(root, DIAGNOSTIC_FILE), 'utf8')
if (!diagnosticIdentity.every((marker) => diagnosticHtml.includes(marker))) {
  throw new Error('The diagnostic does not match the generated release.')
}

// One worker owns a complete, content-hashed release. Never cache user records,
// backup files, cross-origin requests, or arbitrary runtime responses.
const worker = `const CACHE_NAME = ${JSON.stringify(cacheName)}
const FILES = ${JSON.stringify(paths)}
const ENTRY_ASSETS = ${JSON.stringify(entryAssets)}
const SCOPE = self.registration.scope
const INDEX = new URL('index.html', SCOPE).href
const DIAGNOSTIC = new URL(${JSON.stringify(DIAGNOSTIC_FILE)}, SCOPE).href
const DIAGNOSTIC_IDENTITY = ${JSON.stringify(diagnosticIdentity)}
const URLS = new Set(FILES.map((path) => new URL(path, SCOPE).href))

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll([...URLS])
    const html = await (await cache.match(INDEX))?.text()
    if (!html || !ENTRY_ASSETS.every((path) => html.includes('./' + path))) {
      throw new Error('The deployment served a mixed release; keep the previous offline shell.')
    }
    const diagnostic = await (await cache.match(DIAGNOSTIC))?.text()
    if (!diagnostic || !DIAGNOSTIC_IDENTITY.every((marker) => diagnostic.includes(marker))) {
      throw new Error('The deployment served a mixed diagnostic release; keep the previous offline shell.')
    }
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter((key) => key.startsWith('lumen-shell-'))
    // Keep the preceding shell while a tab from that release may still be open.
    for (const key of old.filter((key) => key !== CACHE_NAME).slice(0, -1)) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'LUMEN_APPLY_UPDATE') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return
  if (request.mode === 'navigate') {
    // Only this exact, precached HTML path bypasses the normal app entry.
    // A/B/C query strings select content in that same independent document.
    const target = url.pathname === new URL(DIAGNOSTIC).pathname ? DIAGNOSTIC : INDEX
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(target)) ?? fetch(request)))
    return
  }
  if (URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(url.href)) ?? fetch(request)))
    return
  }
  // A still-open page can request assets from the previous release.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
  }
})
`

await writeFile(join(root, 'sw.js'), worker)
console.log(`Offline shell: ${cacheName}, ${paths.length} files`)
