import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

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
if (!paths.includes('index.html') || !paths.some((path) => path.startsWith('assets/'))) {
  throw new Error('Refusing to generate an incomplete offline shell.')
}
const hash = createHash('sha256')
for (const path of files) {
  hash.update(relative(root, path))
  hash.update(await readFile(path))
}
const cacheName = `lumen-shell-${hash.digest('hex').slice(0, 16)}`

// One worker owns a complete, content-hashed release. Never cache user records,
// backup files, cross-origin requests, or arbitrary runtime responses.
const worker = `const CACHE_NAME = ${JSON.stringify(cacheName)}
const FILES = ${JSON.stringify(paths)}
const SCOPE = self.registration.scope
const INDEX = new URL('index.html', SCOPE).href
const URLS = new Set(FILES.map((path) => new URL(path, SCOPE).href))

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([...URLS])))
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
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(INDEX)) ?? fetch(request)))
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
