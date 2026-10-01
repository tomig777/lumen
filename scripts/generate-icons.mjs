import { readFile } from 'node:fs/promises'
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

const source = await readFile(new URL('../public/lumen-icon.svg', import.meta.url))
for (const size of [180, 192, 512]) {
  const filename = `lumen-icon-v1-${size}.png`
  const output = new URL(`../public/${filename}`, import.meta.url)
  const info = await sharp(source, { density: 384 })
    .resize(size, size)
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
