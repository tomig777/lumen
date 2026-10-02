import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { inflateSync } from 'node:zlib'

const scope = new URL('https://example.test/lumen/')
const sizes = [32, 180, 192, 512]
const filename = (size) => `lumen-icon-v2-${size}.png`
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))

// Read the exports without adding an image library to the build/CI dependencies.
function decodeRgbPng(bytes) {
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  const chunks = []
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    assert.ok(offset + length + 12 <= bytes.length, 'complete PNG chunk')
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) })
    offset += length + 12
  }
  const header = chunks.find((chunk) => chunk.type === 'IHDR').data
  const width = header.readUInt32BE(0)
  const height = header.readUInt32BE(4)
  assert.equal(header[8], 8, 'eight-bit pixels')
  assert.equal(header[9], 2, 'RGB without an alpha channel')
  assert.equal(header[12], 0, 'non-interlaced PNG')
  assert.ok(!chunks.some((chunk) => chunk.type === 'tRNS'), 'no transparent-color key')
  const raw = inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)))
  const stride = width * 3
  assert.equal(raw.length, (stride + 1) * height)
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    assert.ok(filter <= 4, 'known PNG row filter')
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x
      const left = x >= 3 ? pixels[index - 3] : 0
      const above = y > 0 ? pixels[index - stride] : 0
      const upperLeft = y > 0 && x >= 3 ? pixels[index - stride - 3] : 0
      const estimate = left + above - upperLeft
      const distances = [left, above, upperLeft].map((value) => Math.abs(estimate - value))
      const paeth = distances[0] <= distances[1] && distances[0] <= distances[2] ? left : distances[1] <= distances[2] ? above : upperLeft
      const prediction = [0, left, above, Math.floor((left + above) / 2), paeth][filter]
      pixels[index] = (raw[y * (stride + 1) + 1 + x] + prediction) & 255
    }
  }
  return { width, height, pixels, pixel(x, y) { return [...pixels.subarray((y * width + x) * 3, (y * width + x) * 3 + 3)] } }
}

function scopedUrl(path, base = scope) {
  assert.ok(path.startsWith('./'), 'relative asset URL')
  const url = new URL(path, base)
  assert.equal(url.origin, scope.origin)
  assert.ok(url.pathname.startsWith(scope.pathname), 'asset stays under the GitHub Pages repository path')
  return url
}

test('glassy PNG icons stay opaque, warm, legible and inside the maskable safe zone', async () => {
  for (const size of sizes) {
    const bytes = await readFile(new URL(`../public/${filename(size)}`, import.meta.url))
    const png = decodeRgbPng(bytes)
    assert.equal(png.width, size)
    assert.equal(png.height, size)
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
      const [r, g, b] = png.pixel(x, y)
      assert.ok(Math.max(r, g, b) < 50 && Math.min(r, g, b) > 15 && r >= g && g >= b,
        'full-bleed dark-brown corners, not transparent or baked-in white corners')
    }
    let highlights = 0, warmHighlights = 0
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 3
        const [r, g, b] = png.pixels.subarray(offset, offset + 3)
        // The raster has subtle background shading. Test the high-contrast
        // glass silhouette, rather than requiring every shaded pixel to be
        // an exact flat color as the previous vector artwork was.
        if (Math.max(r, g, b) > 100) {
          highlights++
          if (r >= g && g >= b) warmHighlights++
          assert.ok(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= size * 0.4,
            'visible emblem stays inside the central 80%-diameter maskable safe circle')
        }
      }
    }
    assert.ok(highlights / (size * size) > .15 && highlights / (size * size) < .4,
      'a distinct high-contrast shape with enough breathing room, including at favicon size')
    assert.ok(warmHighlights / highlights > .97, 'cream/amber/brown palette, not unrelated cool colors')
    assert.deepEqual(await readFile(new URL(`../dist/${filename(size)}`, import.meta.url)), bytes, 'build copies the exact exported PNG')
  }
})

test('iPhone metadata and manifest declare PNG icons that resolve beneath /lumen/', () => {
  const touchIcons = html.match(/<link\b[^>]*\brel="apple-touch-icon"[^>]*>/g) ?? []
  assert.equal(touchIcons.length, 1)
  assert.match(touchIcons[0], /\btype="image\/png"/)
  assert.match(touchIcons[0], /\bsizes="180x180"/)
  const touchPath = touchIcons[0].match(/\bhref="([^"]+)"/)[1]
  assert.equal(scopedUrl(touchPath).pathname, `/lumen/${filename(180)}`)
  assert.match(html, /<meta\b[^>]*\bname="apple-mobile-web-app-title"[^>]*\bcontent="Lumen"/)
  assert.match(html, /<link\b[^>]*\brel="icon"[^>]*\btype="image\/png"[^>]*\bsizes="32x32"[^>]*\bhref="\.\/lumen-icon-v2-32\.png"/)
  const manifestPath = html.match(/<link\b[^>]*\brel="manifest"[^>]*\bhref="([^"]+)"/)[1]
  const manifestUrl = scopedUrl(manifestPath)
  assert.equal(manifest.short_name, 'Lumen')
  assert.equal(scopedUrl(manifest.start_url, manifestUrl).href, scope.href)
  assert.equal(scopedUrl(manifest.scope, manifestUrl).href, scope.href)
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`)
    assert.ok(icon, `manifest includes ${size}-pixel icon`)
    assert.equal(icon.type, 'image/png')
    assert.equal(icon.purpose, 'any maskable')
    assert.equal(scopedUrl(icon.src, manifestUrl).pathname, `/lumen/${filename(size)}`)
  }
})

test('the production offline shell includes all new PNG icons and the conventional touch fallback, not the large master', async () => {
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  const files = JSON.parse(worker.match(/^const FILES = (\[[^\n]+\])/m)[1])
  for (const asset of ['apple-touch-icon.png', 'manifest.webmanifest', ...sizes.map(filename)]) {
    assert.ok(files.includes(asset), `offline shell includes ${asset}`)
  }
  assert.ok(!files.some((asset) => asset.includes('source.png')), 'authoring master is not a deployed asset')
})

test('install metadata is PNG-only and retains the existing app identity and full-screen mode', () => {
  assert.equal(manifest.icons.length, 2)
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png')
    assert.match(icon.src, /^\.\/lumen-icon-v2-\d+\.png$/)
    assert.doesNotMatch(icon.src, /svg|\?|https?:/i)
  }
  assert.doesNotMatch(html, /rel="(?:icon|apple-touch-icon)"[^>]*svg/i)
  assert.equal(manifest.name, 'Lumen — Your personal space')
  assert.equal(manifest.start_url, './')
  assert.equal(manifest.scope, './')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.id, undefined, 'do not change the effective existing start-URL identity')
  assert.match(html, /viewport-fit=cover/)
  assert.match(html, /apple-mobile-web-app-status-bar-style" content="black-translucent/)
})

test('conventional touch fallback is exactly the new opaque 180px artwork', async () => {
  const versioned = await readFile(new URL(`../public/${filename(180)}`, import.meta.url))
  for (const directory of ['public', 'dist']) {
    assert.deepEqual(await readFile(new URL(`../${directory}/apple-touch-icon.png`, import.meta.url)), versioned)
  }
})
