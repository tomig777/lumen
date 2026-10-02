import { readFile, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Optional authoring tool: the exported PNGs are checked in, so building and
// publishing Lumen never depend on Sharp or on this machine's runtime paths.
const require = createRequire(import.meta.url)
let sharp
try {
  sharp = require(process.argv[2] ?? 'sharp')
} catch (cause) {
  throw new Error('Icon export needs Sharp. Run pnpm icons:generate with an optional absolute path to an installed sharp module.', { cause })
}

// The master is generated artwork, not deployed as a large app asset. Only
// deterministic downsampling/format exports happen here; no creative edits.
const source = await readFile(new URL('../assets/brand/lumen-icon-v2-source.png', import.meta.url))
const sourceMetadata = await sharp(source).metadata()
if (sourceMetadata.width !== sourceMetadata.height || sourceMetadata.width < 512) {
  throw new Error('Icon master must be square and at least 512 pixels.')
}
for (const size of [32, 180, 192, 512]) {
  const filename = `lumen-icon-v2-${size}.png`
  const output = new URL(`../public/${filename}`, import.meta.url)
  const info = await sharp(source)
    .resize(size, size, { kernel: 'lanczos3' })
    .toColourspace('srgb')
    .flatten({ background: '#24211e' })
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toFile(fileURLToPath(output))
  const metadata = await sharp(fileURLToPath(output)).metadata()
  if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha || metadata.format !== 'png') {
    throw new Error(`Invalid icon export: ${filename}`)
  }
  console.log(`${filename}: ${size} × ${size}, opaque PNG, ${info.size} bytes`)
}
// A conventional PNG fallback for clients which probe this name. The explicit
// HTML link uses a new versioned URL, not a query-only cache-busting change.
await copyFile(new URL('../public/lumen-icon-v2-180.png', import.meta.url),
  new URL('../public/apple-touch-icon.png', import.meta.url))
