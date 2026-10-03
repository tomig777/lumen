import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { classifyTasks, localDateKey, previousLocalDate, selectedDateAfterRollover, taskCanToggleOn, taskDrawerGroups, taskIsComplete, taskScheduledOn, toggleTaskForDate } from '../src/daily.ts'

const task = (overrides = {}) => ({ id: 'one', title: 'A task', completed: false, priority: 'medium', ...overrides })

test('calendar keys use local calendar components and cross year/DST boundaries', () => {
  assert.equal(localDateKey(new Date(2027, 0, 1, 0, 3)), '2027-01-01')
  assert.equal(previousLocalDate('2027-01-01'), '2026-12-31')
  assert.equal(previousLocalDate('2026-03-30'), '2026-03-29')
  assert.equal(previousLocalDate('2026-10-26'), '2026-10-25')
})

test('the same instant follows the device time zone without rewriting stored dates', () => {
  const script = `import { localDateKey } from ${JSON.stringify(new URL('../src/daily.ts', import.meta.url).href)}; process.stdout.write(localDateKey(new Date('2026-09-29T22:30:00Z')))`
  const inZone = (zone) => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout
  }
  assert.equal(inZone('Europe/Budapest'), '2026-09-30')
  assert.equal(inZone('America/New_York'), '2026-09-29')
})

test('midnight advances a selected Today but preserves a browsed historical day', () => {
  assert.equal(selectedDateAfterRollover('2026-12-31', '2026-12-31', '2027-01-01'), '2027-01-01')
  assert.equal(selectedDateAfterRollover('2026-08-25', '2026-12-31', '2027-01-01'), '2026-08-25')
})

test('daily completion is recorded once per day and yesterday is preserved', () => {
  const item = task({ recurrence: 'daily', dueDate: '2026-09-28', completedOn: [] })
  const doneYesterday = toggleTaskForDate(item, '2026-09-28', '2026-09-28T08:00:00Z')
  assert.equal(taskIsComplete(doneYesterday, '2026-09-29'), false)
  assert.deepEqual(classifyTasks([doneYesterday], '2026-09-29').yesterdayDone.map((value) => value.id), ['one'])
  const doneToday = toggleTaskForDate(doneYesterday, '2026-09-29', '2026-09-29T08:00:00Z')
  assert.equal(doneToday.completedOn.length, 2)
  assert.equal(taskIsComplete(doneToday, '2026-09-29'), true)
  const undoneToday = toggleTaskForDate(doneToday, '2026-09-29', '2026-09-29T09:00:00Z')
  assert.deepEqual(undoneToday.completedOn.map((event) => event.date), ['2026-09-28'])
})

test('weekdays skip weekends and one-off tasks separate overdue and unscheduled', () => {
  assert.equal(taskScheduledOn(task({ recurrence: 'weekdays', dueDate: '2026-09-28' }), '2026-10-03'), false)
  assert.equal(taskScheduledOn(task({ recurrence: 'weekdays', dueDate: '2026-09-28' }), '2026-10-05'), true)
  const grouped = classifyTasks([
    task({ id: 'today', dueDate: '2026-09-29' }),
    task({ id: 'overdue', dueDate: '2026-09-28' }),
    task({ id: 'loose' }),
    task({ id: 'legacy', completed: true }),
  ], '2026-09-29')
  assert.deepEqual(grouped.today.map((value) => value.id), ['today'])
  assert.deepEqual(grouped.overdue.map((value) => value.id), ['overdue'])
  assert.deepEqual(grouped.unscheduled.map((value) => value.id), ['loose'])
  assert.deepEqual(grouped.yesterdayDone, []) // Old boolean-only records have no trustworthy date.
})

test('drawer index includes every task once, including future, off-day recurrence and legacy completions', () => {
  const items = [task({ id: 'today', dueDate: '2026-10-03' }), task({ id: 'late', dueDate: '2026-10-02' }),
    task({ id: 'loose' }), task({ id: 'future', dueDate: '2026-10-04' }), task({ id: 'legacy', completed: true }),
    task({ id: 'daily', recurrence: 'daily', completedOn: [{ date: '2026-10-02', at: 'noon' }] }),
    task({ id: 'weekdays', recurrence: 'weekdays' }), task({ id: 'done', dueDate: '2026-10-03', completed: true })]
  const groups = taskDrawerGroups(items, '2026-10-03')
  assert.deepEqual(groups.map(group => [group.id, group.tasks.map(item => item.id)]), [
    ['today', ['today', 'daily']], ['overdue', ['late']], ['unscheduled', ['loose']],
    ['upcoming', ['future', 'weekdays']], ['completed', ['legacy', 'done']],
  ])
  assert.equal(new Set(groups.flatMap(group => group.tasks.map(item => item.id))).size, items.length)
  assert.deepEqual(taskDrawerGroups([], '2026-10-03'), [])
  assert.equal(classifyTasks(items, '2026-10-03').yesterdayDone[0].id, 'daily')
})

test('drawer completion actions cannot record future or off-day recurring tasks as today', () => {
  for (const item of [task({ dueDate: '2026-10-04' }), task({ recurrence: 'daily', dueDate: '2026-10-04' }), task({ recurrence: 'weekdays' })])
    assert.equal(taskCanToggleOn(item, '2026-10-03'), false)
  for (const item of [task(), task({ dueDate: '2026-10-02' }), task({ completed: true }), task({ recurrence: 'daily' }),
    task({ recurrence: 'weekdays', completedOn: [{ date: '2026-10-03', at: 'noon' }] })])
    assert.equal(taskCanToggleOn(item, '2026-10-03'), true)
  assert.equal(taskCanToggleOn(task({ recurrence: 'weekdays' }), '2026-10-05'), true)
})
