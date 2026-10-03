import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// Local QA only: extract the real internal components without exporting them
// from production or importing App's storage/launch/service-worker owners.
export function extractHomeBaseline(source) {
  const take = (pattern, name) => {
    const match = source.match(pattern)
    if (!match) throw new Error(`Home baseline extraction failed: ${name}`)
    return match[0]
  }
  const helpers = ['dateFromIso', 'formatLongDate', 'IconButton'].map(name =>
    take(new RegExp(`function ${name}[^]*?\\n}`), name))
  return [
    "import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'",
    "import { motion, useReducedMotion } from 'framer-motion'",
    take(/import \{\r?\n[^]*?\} from 'lucide-react'/, 'icons'),
    "import { classifyTasks, taskIsComplete } from './daily'",
    "import { HomeCharacter } from './components/HomeCharacter'",
    ...helpers,
    take(/function HomeScreen[^]*?(?=\nfunction BackupCounts)/, 'HomeScreen'),
    take(/function SheetFrame[^]*?(?=\nfunction ImageViewer)/, 'SheetFrame/RenderSheet'),
    'export { HomeScreen, RenderSheet }',
  ].join('\n')
}

export async function buildHomeBaseline() {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const extracted = extractHomeBaseline(await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'))
  await build({
    absWorkingDir: root,
    entryPoints: ['tests/fixtures/home-baseline-case.tsx'],
    outfile: 'tests/fixtures/.generated/home-baseline.js',
    bundle: true, format: 'esm', jsx: 'transform', sourcemap: false,
    loader: { '.png': 'dataurl' },
    define: { 'import.meta.env.PROD': 'true', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolated-home-baseline', setup(api) {
      api.onResolve({ filter: /^lumen-home-baseline$/ }, () => ({ path: 'internal', namespace: 'home-baseline' }))
      api.onLoad({ filter: /.*/, namespace: 'home-baseline' }, () => ({
        contents: extracted, loader: 'tsx', resolveDir: fileURLToPath(new URL('../src/', import.meta.url)),
      }))
    } }],
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await buildHomeBaseline()
  console.log('Built local-only Home baseline fixture. Serve with Vite; open /tests/fixtures/home-baseline.html.')
}
