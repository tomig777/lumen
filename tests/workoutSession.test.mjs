import assert from 'node:assert/strict'
import { test } from 'node:test'
import { advanceWorkoutSession, beginWorkoutSession, recordWorkoutSet } from '../src/workoutSession.ts'

const plan = () => ({ id: 'plan-2026-09-29', date: '2026-09-29', title: 'Strength', focus: 'Upper body', warmupMinutes: 5, notes: '', exercises: [
  { id: 'press', exerciseId: 'exercise-press', sets: 2, reps: 10, unit: 'reps', phase: 'main' },
  { id: 'plank', exerciseId: 'exercise-plank', sets: 1, reps: 30, unit: 'seconds', phase: 'cooldown' },
] })

test('a dated session records sets, survives a serialized reload, resumes and completes', () => {
  const started = beginWorkoutSession(plan(), '2026-09-29T08:00:00Z')
  assert.equal(started.session.activeIndex, 0)
  assert.equal(beginWorkoutSession(started, '2026-09-29T08:01:00Z'), started)
  const oneSet = recordWorkoutSet(started, 0)
  assert.equal(advanceWorkoutSession(oneSet, 0, '2026-09-29T08:02:00Z'), oneSet)
  const resumed = JSON.parse(JSON.stringify(oneSet))
  const twoSets = recordWorkoutSet(resumed, 0)
  assert.equal(recordWorkoutSet(twoSets, 0), twoSets)
  const next = advanceWorkoutSession(twoSets, 0, '2026-09-29T08:03:00Z')
  assert.equal(next.session.activeIndex, 1)
  const lastSet = recordWorkoutSet(next, 1)
  const done = advanceWorkoutSession(lastSet, 1, '2026-09-29T08:04:00Z')
  assert.equal(done.session.completedAt, '2026-09-29T08:04:00Z')
  assert.equal(recordWorkoutSet(done, 1), done)
  assert.equal(beginWorkoutSession(done, '2026-09-30T08:00:00Z'), done)
})

test('rest days cannot create a session', () => {
  const rest = { ...plan(), exercises: [] }
  assert.equal(beginWorkoutSession(rest, '2026-09-29T08:00:00Z'), rest)
})
