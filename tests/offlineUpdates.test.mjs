import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOfflineUpdateMonitor } from '../src/offlineUpdates.ts'

class Worker extends EventTarget {
  state = 'installing'
  messages = []
  transition(state) { this.state = state; this.dispatchEvent(new Event('statechange')) }
  postMessage(message) { this.messages.push(message) }
}

function harness({ waiting = null, installing = null, active = true, controlled = true, existing = true } = {}) {
  const registration = new EventTarget()
  Object.assign(registration, { waiting, installing, active: active ? new Worker() : null })
  let updateAction = async () => {}
  let online = true
  let updates = 0
  let registrations = 0
  let applies = 0
  let registrationError = false
  const container = new EventTarget()
  container.controller = controlled ? new Worker() : null
  container.getRegistration = async () => { if (registrationError) throw new Error('Unavailable'); return existing ? registration : undefined }
  container.register = async (path, options) => {
    registrations++
    assert.equal(path, './sw.js')
    assert.deepEqual(options, { scope: './', updateViaCache: 'none' })
    return registration
  }
  registration.update = async () => { updates++; await updateAction() }
  const snapshots = []
  const monitor = createOfflineUpdateMonitor({ serviceWorkers: container, isOnline: () => online,
    onState: (state) => snapshots.push(state), onApply: () => { applies++ } })
  return { monitor, registration, container, snapshots,
    get state() { return snapshots.at(-1) }, get updates() { return updates }, get applies() { return applies }, get registrations() { return registrations },
    setOnline(value) { online = value }, setUpdate(action) { updateAction = action }, setRegistrationError(value) { registrationError = value },
    controllerChange() { container.controller = new Worker(); container.dispatchEvent(new Event('controllerchange')) },
  }
}

test('an explicit successful check reports no newer update, never applies automatically', async () => {
  const app = harness()
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'current')
  assert.equal(app.state.ready, true)
  assert.equal(app.state.updateAvailable, false)
  assert.ok(Date.parse(app.state.lastCheckedAt))
  assert.equal(app.updates, 1)
  assert.equal(app.applies, 0)
  app.monitor.applyUpdate()
  assert.equal(app.applies, 0)
  app.monitor.dispose()
})

test('an update already waiting at startup remains visible until explicitly applied', async () => {
  const waiting = new Worker()
  const app = harness({ waiting })
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'available')
  assert.equal(app.state.updateAvailable, true)
  assert.equal(waiting.messages.length, 0)
  app.monitor.applyUpdate()
  assert.deepEqual(waiting.messages, [{ type: 'LUMEN_APPLY_UPDATE' }])
  assert.equal(app.applies, 0)
  app.controllerChange()
  assert.equal(app.applies, 1)
  app.monitor.dispose()
})

test('an install that started before registration resolves is observed through readiness', async () => {
  const worker = new Worker()
  const app = harness({ installing: worker, active: false, controlled: false, existing: false })
  await app.monitor.checkForUpdates()
  assert.equal(app.registrations, 1)
  assert.equal(app.state.status, 'downloading')
  assert.equal(app.updates, 0)
  app.registration.installing = null
  app.registration.active = worker
  worker.transition('activated')
  app.controllerChange()
  assert.equal(app.state.ready, true)
  assert.equal(app.state.status, 'current')
  assert.equal(app.state.updateAvailable, false)
  assert.equal(app.applies, 0)
  app.monitor.dispose()
})

test('a new worker stays downloading until its complete shell is waiting', async () => {
  const app = harness()
  const worker = new Worker()
  app.setUpdate(async () => {
    app.registration.installing = worker
    app.registration.dispatchEvent(new Event('updatefound'))
  })
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'downloading')
  assert.equal(app.state.updateAvailable, false)
  app.registration.installing = null
  app.registration.waiting = worker
  worker.transition('installed')
  assert.equal(app.state.status, 'available')
  assert.equal(app.state.updateAvailable, true)
  assert.equal(app.applies, 0)
  app.monitor.dispose()
})

test('failed checks and failed installs do not claim the app is up to date', async () => {
  const app = harness()
  app.setUpdate(async () => { throw new Error('Network failure') })
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'error')
  assert.equal(app.state.lastCheckedAt, null)
  app.setUpdate(async () => {})
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'current')
  const worker = new Worker()
  app.registration.installing = worker
  app.registration.dispatchEvent(new Event('updatefound'))
  app.registration.installing = null
  worker.transition('redundant')
  assert.equal(app.state.status, 'error')
  assert.equal(app.applies, 0)
  app.monitor.dispose()
})

test('offline launch discovers the existing shell without registering or requesting an update', async () => {
  const app = harness()
  app.setOnline(false)
  await app.monitor.checkForUpdates()
  assert.equal(app.state.ready, true)
  assert.equal(app.state.status, 'offline')
  assert.equal(app.updates, 0)
  assert.equal(app.registrations, 0)
  assert.equal(app.state.lastCheckedAt, null)
  app.monitor.dispose()
})

test('an install failure during the check is not overwritten with a success message', async () => {
  const app = harness()
  const worker = new Worker()
  app.setUpdate(async () => {
    app.registration.installing = worker
    app.registration.dispatchEvent(new Event('updatefound'))
    app.registration.installing = null
    worker.transition('redundant')
  })
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'error')
  assert.equal(app.state.lastCheckedAt, null)
  app.monitor.dispose()
})

test('offline checks retain a completely downloaded update as ready to apply', async () => {
  const waiting = new Worker()
  const app = harness({ waiting })
  app.setOnline(false)
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'available')
  app.monitor.applyUpdate()
  assert.equal(waiting.messages.length, 1)
  assert.equal(app.updates, 0)
  app.monitor.dispose()
})

test('another tab activating a shell offers a reload without discarding this page', async () => {
  const app = harness()
  await app.monitor.checkForUpdates()
  app.controllerChange()
  assert.equal(app.state.status, 'available')
  assert.equal(app.state.updateAvailable, true)
  assert.equal(app.applies, 0)
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'available')
  app.monitor.applyUpdate()
  assert.equal(app.applies, 1)
  app.monitor.dispose()
})

test('concurrent checks share one request and disposed observers publish no late state', async () => {
  const app = harness()
  let finish
  app.setUpdate(() => new Promise((resolve) => { finish = resolve }))
  const first = app.monitor.checkForUpdates()
  const second = app.monitor.checkForUpdates()
  assert.equal(first, second)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(app.updates, 1)
  const count = app.snapshots.length
  app.monitor.dispose()
  finish()
  await first
  app.controllerChange()
  app.registration.dispatchEvent(new Event('updatefound'))
  assert.equal(app.snapshots.length, count)
  assert.equal(app.applies, 0)
})

test('registration failures are reported and a subsequent check can retry', async () => {
  const app = harness()
  app.setRegistrationError(true)
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'error')
  app.setRegistrationError(false)
  await app.monitor.checkForUpdates()
  assert.equal(app.state.status, 'current')
  app.monitor.dispose()
})

test('browsers without service workers show an explicit unavailable status', async () => {
  let state
  const monitor = createOfflineUpdateMonitor({ serviceWorkers: null, isOnline: () => true,
    onState: (value) => { state = value }, onApply: () => assert.fail('Must not reload') })
  await monitor.checkForUpdates()
  assert.equal(state.status, 'unsupported')
  assert.equal(state.ready, false)
  monitor.applyUpdate()
  monitor.dispose()
})
