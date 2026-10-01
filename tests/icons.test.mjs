import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { inflateSync } from 'node:zlib'

const scope = new URL('https://example.test/lumen/')
const background = [36, 33, 30]
const cream = [232, 217, 199]
const accent = [198, 171, 141]
const sizes = [180, 192, 512]
const filename = (size) => `lumen-icon-v1-${size}.png`
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

test('square opaque icons preserve the palette and keep the mark inside the maskable safe zone', async () => {
  const svg = await readFile(new URL('../public/lumen-icon.svg', import.meta.url), 'utf8')
  assert.match(svg, /viewBox="0 0 512 512"/)
  assert.match(svg, /<title[^>]*>Lumen<\/title>/)
  for (const size of sizes) {
    const bytes = await readFile(new URL(`../public/${filename(size)}`, import.meta.url))
    const png = decodeRgbPng(bytes)
    assert.equal(png.width, size)
    assert.equal(png.height, size)
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
      assert.deepEqual(png.pixel(x, y), background, 'opaque dark-brown square corners; the platform applies its own mask')
    }
    const sourcePixel = (x, y) => png.pixel(Math.floor(x * size / 512), Math.floor(y * size / 512))
    assert.deepEqual(sourcePixel(186, 220), cream, 'cream L stem')
    assert.deepEqual(sourcePixel(285, 354), cream, 'cream L foot')
    assert.deepEqual(sourcePixel(332, 158), accent, 'warm point of light')
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 3
        const isBackground = background.every((channel, i) => png.pixels[offset + i] === channel)
        if (!isBackground) {
          assert.ok(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= size * 0.4, 'foreground stays inside the central 80%-diameter maskable safe circle')
        }
      }
    }
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
  assert.match(html, /<link\b[^>]*\brel="icon"[^>]*\bhref="\.\/lumen-icon\.svg"/)
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

test('the production offline shell includes the editable logo and all PNG icons', async () => {
  const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
  const files = JSON.parse(worker.match(/^const FILES = (\[[^\n]+\])/m)[1])
  for (const asset of ['lumen-icon.svg', 'manifest.webmanifest', ...sizes.map(filename)]) {
    assert.ok(files.includes(asset), `offline shell includes ${asset}`)
  }
})
