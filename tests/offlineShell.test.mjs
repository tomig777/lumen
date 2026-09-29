import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
const scope = 'https://example.test/lumen/'

function harness() {
  const listeners = new Map()
  const stores = new Map()
  let online = true
  let fetches = 0
  let claims = 0
  let skipWaiting = 0
  const fetch = async (request) => {
    fetches++
    if (!online) throw new Error('Network unavailable')
    return `network:${typeof request === 'string' ? request : request.url}`
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
    registration: { scope },
    location: { origin: new URL(scope).origin },
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
  const actual = await readdir(new URL('../dist/', import.meta.url), { recursive: true })
  const outputFiles = actual.filter((name) => !name.endsWith('sw.js') && !name.endsWith('assets') && !name.endsWith('.vite')).map((name) => name.replaceAll('\\', '/')).sort()
  assert.deepEqual([...app.files].sort(), outputFiles)
  await app.dispatch('install')
  assert.equal(app.stores.size, 1)
  assert.equal([...app.stores.values()][0].size, app.files.length)
  await app.dispatch('activate')
  assert.equal(app.claims, 1)
  app.setOffline()
  const navigation = await app.dispatch('fetch', { request: { url: scope, method: 'GET', mode: 'navigate' } })
  assert.equal(navigation, `network:${scope}index.html`)
  const asset = new URL(app.files.find((name) => name.startsWith('assets/')), scope).href
  assert.equal(await app.dispatch('fetch', { request: { url: asset, method: 'GET', mode: 'no-cors' } }), `network:${asset}`)
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
  assert.equal(loaded, `network:${scope}`)
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
