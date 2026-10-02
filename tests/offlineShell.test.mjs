import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { runInNewContext } from 'node:vm'

const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
const currentIndex = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const currentDiagnostic = await readFile(new URL('../dist/screen-layout-test.html', import.meta.url), 'utf8')
const scope = 'https://example.test/lumen/'

function harness(indexHtml = currentIndex, diagnosticHtml = currentDiagnostic, appScope = scope) {
  const listeners = new Map()
  const stores = new Map()
  let online = true
  let fetches = 0
  let claims = 0
  let skipWaiting = 0
  const fetch = async (request) => {
    fetches++
    if (!online) throw new Error('Network unavailable')
    const url = typeof request === 'string' ? request : request.url
    return { label: `network:${url}`, async text() {
      const pathname = new URL(url).pathname
      return pathname.endsWith('/index.html') ? indexHtml : pathname.endsWith('/screen-layout-test.html') ? diagnosticHtml : ''
    } }
  }
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)
      return {
        async addAll(urls) { for (const url of urls) store.set(url, await fetch(url)) },
        async match(url) { return store.get(typeof url === 'string' ? url : url.url) },
      }
    },
    async keys() { return [...stores.keys()] },
    async delete(name) { return stores.delete(name) },
    async match(request) {
      for (const store of stores.values()) if (store.has(request.url)) return store.get(request.url)
      return undefined
    },
  }
  const self = {
    registration: { scope: appScope },
    location: { origin: new URL(appScope).origin },
    clients: { async claim() { claims++ } },
    skipWaiting() { skipWaiting++ },
    addEventListener(name, listener) { listeners.set(name, listener) },
  }
  const context = { self, caches, fetch, URL }
  runInNewContext(worker, context)
  async function dispatch(name, input = {}) {
    let promise
    listeners.get(name)({
      ...input,
      waitUntil(value) { promise = value },
      respondWith(value) { promise = value },
    })
    return promise
  }
  return {
    dispatch,
    stores,
    setOffline() { online = false },
    get fetches() { return fetches },
    get claims() { return claims },
    get skipWaiting() { return skipWaiting },
    files: runInNewContext('FILES', context),
  }
}

test('release precaches every output asset and serves the matching shell offline', async () => {
  const app = harness()
  const root = fileURLToPath(new URL('../dist/', import.meta.url))
  const actual = await readdir(root, { recursive: true, withFileTypes: true })
  const outputFiles = actual.filter((entry) => entry.isFile() && entry.name !== 'sw.js')
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).replaceAll('\\', '/')).sort()
  assert.deepEqual([...app.files].sort(), outputFiles)
  await app.dispatch('install')
  assert.equal(app.stores.size, 1)
  assert.equal([...app.stores.values()][0].size, app.files.length)
  await app.dispatch('activate')
  assert.equal(app.claims, 1)
  app.setOffline()
  const navigation = await app.dispatch('fetch', { request: { url: scope, method: 'GET', mode: 'navigate' } })
  assert.equal(navigation.label, `network:${scope}index.html`)
  const asset = new URL(app.files.find((name) => name.startsWith('assets/')), scope).href
  assert.equal((await app.dispatch('fetch', { request: { url: asset, method: 'GET', mode: 'no-cors' } })).label, `network:${asset}`)
  assert.equal(app.fetches, app.files.length)
})

test('worker never caches or intercepts personal data or cross-origin traffic', async () => {
  const app = harness()
  await app.dispatch('install')
  const originalCount = [...app.stores.values()][0].size
  assert.equal(await app.dispatch('fetch', { request: { url: `${scope}private-export.json`, method: 'GET', mode: 'cors' } }), undefined)
  assert.equal(await app.dispatch('fetch', { request: { url: 'https://other.test/image.png', method: 'GET', mode: 'no-cors' } }), undefined)
  assert.equal(await app.dispatch('fetch', { request: { url: `${scope}index.html`, method: 'POST', mode: 'cors' } }), undefined)
  assert.equal([...app.stores.values()][0].size, originalCount)
})

test('an evicted shell falls back to network when online', async () => {
  const app = harness()
  await app.dispatch('install')
  const cache = [...app.stores.values()][0]
  cache.delete(`${scope}index.html`)
  const loaded = await app.dispatch('fetch', { request: { url: scope, method: 'GET', mode: 'navigate' } })
  assert.equal(loaded.label, `network:${scope}`)
})

test('a stale HTML entry point cannot install over the previous offline release', async () => {
  const app = harness('<script src="./assets/index-from-an-old-release.js"></script>')
  app.stores.set('lumen-shell-previous', new Map([['old-asset', 'old-content']]))
  await assert.rejects(app.dispatch('install'), /mixed release/)
  assert.equal(app.stores.has('lumen-shell-previous'), true)
  assert.equal(app.claims, 0)
})

test('new worker waits for user action and retains the previous shell for open tabs', async () => {
  const app = harness()
  app.stores.set('lumen-shell-previous', new Map([['old-asset', 'old-content']]))
  await app.dispatch('install')
  await app.dispatch('activate')
  assert.equal(app.skipWaiting, 0)
  assert.equal(app.stores.has('lumen-shell-previous'), true)
  await app.dispatch('message', { data: { type: 'LUMEN_APPLY_UPDATE' } })
  assert.equal(app.skipWaiting, 1)
})

for (const appScope of [scope, 'https://example.test/']) {
  test(`only the exact diagnostic route bypasses the app shell offline (${appScope})`, async () => {
    const app = harness(currentIndex, currentDiagnostic, appScope)
    await app.dispatch('install')
    app.setOffline()
    for (const query of ['', '?case=a&theme=light', '?case=b&theme=dark', '?case=c&theme=dark', '?case=unknown']) {
      const response = await app.dispatch('fetch', { request: { url: `${appScope}screen-layout-test.html${query}`, method: 'GET', mode: 'navigate' } })
      assert.equal(response.label, `network:${appScope}screen-layout-test.html`)
      assert.equal(await response.text(), currentDiagnostic)
      assert.doesNotMatch(await response.text(), /assets\/index-/)
    }
    for (const path of ['', '?case=c', 'home', 'screen-layout-test.html/', 'nested/screen-layout-test.html', 'screen-layout-test.html.fake']) {
      const response = await app.dispatch('fetch', { request: { url: `${appScope}${path}`, method: 'GET', mode: 'navigate' } })
      assert.equal(response.label, `network:${appScope}index.html`)
    }
    assert.equal(app.fetches, app.files.length)
    assert.equal([...app.stores.values()][0].size, app.files.length)
  })
}

test('diagnostic traffic keeps origin, method and scope guards; unknown requests are not cached', async () => {
  const app = harness()
  await app.dispatch('install')
  const before = app.fetches
  for (const request of [
    { url: 'https://other.test/lumen/screen-layout-test.html', method: 'GET', mode: 'navigate' },
    { url: 'https://example.test/screen-layout-test.html', method: 'GET', mode: 'navigate' },
    { url: `${scope}screen-layout-test.html`, method: 'POST', mode: 'navigate' },
    { url: `${scope}screen-layout-test.html?case=b`, method: 'GET', mode: 'cors' },
  ]) assert.equal(await app.dispatch('fetch', { request }), undefined)
  assert.equal(app.fetches, before)
})

test('evicted diagnostic fetches its original query URL, never substitutes the app or caches a runtime response', async () => {
  const app = harness()
  await app.dispatch('install')
  const store = [...app.stores.values()][0]
  store.delete(`${scope}screen-layout-test.html`)
  const request = { url: `${scope}screen-layout-test.html?case=c&theme=dark`, method: 'GET', mode: 'navigate' }
  assert.equal((await app.dispatch('fetch', { request })).label, `network:${request.url}`)
  assert.equal(store.size, app.files.length - 1)
  app.setOffline()
  await assert.rejects(app.dispatch('fetch', { request }), /Network unavailable/)
})

test('a mixed diagnostic cannot install over the preceding release', async () => {
  const app = harness(currentIndex, currentDiagnostic.replace(/name="lumen-diagnostic-build" content="[^"]+"/, 'name="lumen-diagnostic-build" content="old-release"'))
  app.stores.set('lumen-shell-previous', new Map([['old-asset', 'old-content']]))
  await assert.rejects(app.dispatch('install'), /mixed diagnostic release/)
  assert.equal(app.stores.has('lumen-shell-previous'), true)
  assert.equal(app.claims, 0)
  assert.equal(app.skipWaiting, 0)
})
