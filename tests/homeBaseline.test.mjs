import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { transformSync } from 'esbuild'
import { extractHomeBaseline } from '../scripts/build-home-baseline.mjs'
import { baselineData, baselineDate } from './fixtures/home-baseline-data.mjs'

const require = createRequire(import.meta.url)
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const daily = { exports: {} }
new Function('require','module','exports',transformSync(await readFile(new URL('../src/daily.ts', import.meta.url), 'utf8'), { loader:'ts',format:'cjs' }).code)(require,daily,daily.exports)

test('baseline fixtures cover real dated completions without fabricating legacy history', () => {
  const data = baselineData('mixed'), groups = daily.exports.classifyTasks(data.tasks, baselineDate)
  assert.deepEqual(groups.today.map(task => task.id), ['today','recurring'])
  assert.deepEqual(groups.overdue.map(task => task.id), ['overdue'])
  assert.deepEqual(groups.unscheduled.map(task => task.id), ['unscheduled'])
  assert.deepEqual(groups.yesterdayDone.map(task => task.id), ['yesterday'])
  assert.equal(baselineData('empty').tasks.length, 0)
  assert.equal(daily.exports.classifyTasks(baselineData('done').tasks,baselineDate).doneToday.length,1)
  assert.equal(baselineData('many').projects.length,24)
  assert.ok(baselineData('long').tasks[0].title.length > 300)
  data.tasks[0].completed=true
  assert.equal(baselineData('mixed').tasks[0].completed,false,'each case has independent disposable objects')
})

test('local harness uses production Home and real SheetFrame/RenderSheet, not legacy copied markup', () => {
  const source=extractHomeBaseline(app)
  assert.match(source,/function HomeScreen/)
  assert.match(source,/function SheetFrame/)
  assert.match(source,/function RenderSheet/)
  assert.doesNotMatch(source,/LegacyRenderSheet|function App\(|useAppStorage|useOfflineShell/)
  assert.doesNotThrow(()=>transformSync(source,{loader:'tsx',format:'esm'}))
})

test('fixed Home removes shifting groups while retaining editor and baseline regression coverage', async () => {
  const source=extractHomeBaseline(app)
  assert.doesNotMatch(source,/home-day-complete|daily-task-group/)
  assert.match(source,/home-completion-announcement/)
  assert.match(source,/home-task-slot/)
  assert.match(source,/focus\(\{ preventScroll: true \}\)/)
  assert.match(source,/className="task-editor-content"/)
  assert.doesNotMatch(source,/autoFocus value=\{taskDraft.title\}/)
  assert.match(source,/data.projects.map\(/)
  assert.match(source,/<div className="sheet-footer">/)
  const fixture=await readFile(new URL('./fixtures/home-baseline-case.tsx',import.meta.url),'utf8')
  assert.match(fixture,/dismissedStillFocused/)
  assert.match(fixture,/report.editors\[kind\].scrolled/)
  assert.doesNotMatch(fixture,/localStorage|indexedDB|serviceWorker|createDemoState/)
})
