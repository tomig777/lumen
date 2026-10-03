export const baselineDate = '2026-10-03'
const task = (id, fields = {}) => ({ id, title: `Fixture ${id}`, completed: false, priority: 'medium', ...fields })
export function baselineData(kind = 'open') {
  const scheduled = task('today', { dueDate: baselineDate })
  const tasks = kind === 'empty' ? [] : kind === 'done'
    ? [{ ...scheduled, completed: true, completedOn: [{ date: baselineDate, at: '2026-10-03T12:00:00Z' }] }]
    : kind === 'mixed' ? [scheduled,
      task('recurring', { recurrence: 'daily', dueDate: '2026-10-01' }),
      task('weekdays', { recurrence: 'weekdays', dueDate: '2026-10-01' }),
      task('overdue', { dueDate: '2026-10-02' }), task('unscheduled'),
      task('yesterday', { completed: true, completedOn: [{ date: '2026-10-02', at: '2026-10-02T12:00:00Z' }] }),
      task('legacy', { completed: true }), task('future', { dueDate: '2026-10-04' }),
    ] : kind === 'long' ? [{ ...scheduled, title: 'An intentionally long task title with an unbrokenidentifierforwrapping '.repeat(5) }]
    : [scheduled]
  return { tasks, notes: [], thoughts: [], projects: Array.from({ length: kind === 'many' ? 24 : 3 }, (_, index) => ({
    id: `project-${index}`, title: `Fixture project ${index + 1}`, description: '', status: 'active', progress: 0,
  })) }
}
