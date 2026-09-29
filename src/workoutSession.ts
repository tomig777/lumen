import type { DayPlan } from './types'

export function beginWorkoutSession(plan: DayPlan, at: string): DayPlan {
  if (!plan.exercises.length || plan.session?.completedAt) return plan
  return plan.session ? plan : { ...plan, session: { startedAt: at, activeIndex: 0, completedSets: {} } }
}

export function recordWorkoutSet(plan: DayPlan, index: number): DayPlan {
  const planned = plan.exercises[index]
  const session = plan.session
  if (!planned || !session || session.completedAt) return plan
  const previous = session.completedSets[planned.id] ?? 0
  if (previous >= planned.sets) return plan
  return { ...plan, session: { ...session, completedSets: { ...session.completedSets, [planned.id]: previous + 1 } } }
}

export function advanceWorkoutSession(plan: DayPlan, index: number, at: string): DayPlan {
  const planned = plan.exercises[index]
  const session = plan.session
  if (!planned || !session || session.completedAt || (session.completedSets[planned.id] ?? 0) < planned.sets) return plan
  if (index < plan.exercises.length - 1) return { ...plan, session: { ...session, activeIndex: index + 1 } }
  if (plan.exercises.some((exercise) => (session.completedSets[exercise.id] ?? 0) < exercise.sets)) return plan
  return { ...plan, session: { ...session, completedAt: at } }
}
