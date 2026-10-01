import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatScreenLayoutReport, iosVersion } from '../src/screenLayout.ts'

test('screen report identifies the reported iOS version without including the full user agent', () => {
  assert.equal(iosVersion('Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X)'), '17.3')
  assert.equal(iosVersion('Mozilla/5.0 (iPad; CPU OS 18_7_2 like Mac OS X)'), '18.7.2')
  assert.equal(iosVersion('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Not reported')
})

test('the copyable report preserves conflicting viewport readings rather than inventing a correction', () => {
  const report = { rows: [
    ['App', '0.1.2 / abc1234'], ['Screen', '390 × 844'], ['Window', '390 × 797'],
    ['App top–bottom', '0–797 (height 797)'], ['CSS heights', 'vh=844, dvh=797, lvh=844'],
    ['Safe T/R/B/L', '47px / 0px / 34px / 0px'],
  ] }
  const text = formatScreenLayoutReport(report)
  assert.equal(text, 'Lumen screen layout\nApp: 0.1.2 / abc1234\nScreen: 390 × 844\nWindow: 390 × 797\nApp top–bottom: 0–797 (height 797)\nCSS heights: vh=844, dvh=797, lvh=844\nSafe T/R/B/L: 47px / 0px / 34px / 0px')
  assert.equal(report.rows[3][1], '0–797 (height 797)')
})
