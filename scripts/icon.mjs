// Makes tray/pitglass.ico from web/icon.svg. Only needed when the icon changes:
//   node scripts/icon.mjs            (uses Chrome to draw the SVG; set CHROME to its path if needed)
// The .ico holds 16, 24, 32 and 48 px bitmaps plus a 256 px PNG.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import zlib from 'node:zlib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pitglass-icon-'))
const page = path.join(tmp, 'icon.html')
const shot = path.join(tmp, 'icon.png')
fs.writeFileSync(page, `<body style="margin:0;background:transparent"><img src="${pathToFileURL(path.join(root, 'web', 'icon.svg'))}" width="256" height="256" style="display:block">`)
execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--user-data-dir=${path.join(tmp, 'profile')}`, '--window-size=256,256', `--screenshot=${shot}`, pathToFileURL(page).href], { stdio: 'ignore' })

/** 8-bit RGBA, non-interlaced PNG -> raw pixels */
function decode(png) {
  let at = 8
  let w = 0
  let h = 0
  const idat = []
  while (at < png.length) {
    const len = png.readUInt32BE(at)
    const type = png.toString('latin1', at + 4, at + 8)
    const body = png.subarray(at + 8, at + 8 + len)
    if (type === 'IHDR') {
      w = body.readUInt32BE(0)
      h = body.readUInt32BE(4)
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) throw new Error('expected an 8-bit RGBA PNG')
    } else if (type === 'IDAT') idat.push(body)
    at += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const px = Buffer.alloc(w * h * 4)
  const stride = w * 4
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    for (let i = 0; i < stride; i++) {
      const v = raw[y * (stride + 1) + 1 + i]
      const a = i >= 4 ? px[y * stride + i - 4] : 0
      const b = y ? px[(y - 1) * stride + i] : 0
      const c = y && i >= 4 ? px[(y - 1) * stride + i - 4] : 0
      const pa = Math.abs(b - c)
      const pb = Math.abs(a - c)
      const pc = Math.abs(a + b - 2 * c)
      const pred = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      px[y * stride + i] = (v + pred) & 255
    }
  }
  return { w, h, px }
}

/** box-filter downscale of a square image, with alpha-weighted colors */
function shrink(src, size) {
  const out = Buffer.alloc(size * size * 4)
  const k = src.w / size
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = Math.floor(y * k); sy < Math.floor((y + 1) * k); sy++)
        for (let sx = Math.floor(x * k); sx < Math.floor((x + 1) * k); sx++) {
          const i = (sy * src.w + sx) * 4
          const al = src.px[i + 3]
          r += src.px[i] * al
          g += src.px[i + 1] * al
          b += src.px[i + 2] * al
          a += al
          n++
        }
      const o = (y * size + x) * 4
      out[o] = a ? Math.round(r / a) : 0
      out[o + 1] = a ? Math.round(g / a) : 0
      out[o + 2] = a ? Math.round(b / a) : 0
      out[o + 3] = Math.round(a / n)
    }
  return out
}

/** 32-bit icon bitmap: header, pixels bottom-up in BGRA, then the (empty) 1-bit mask */
function bitmap(px, size) {
  const head = Buffer.alloc(40)
  head.writeUInt32LE(40, 0)
  head.writeInt32LE(size, 4)
  head.writeInt32LE(size * 2, 8)
  head.writeUInt16LE(1, 12)
  head.writeUInt16LE(32, 14)
  const body = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const o = ((size - 1 - y) * size + x) * 4
      body[o] = px[i + 2]
      body[o + 1] = px[i + 1]
      body[o + 2] = px[i]
      body[o + 3] = px[i + 3]
    }
  return Buffer.concat([head, body, Buffer.alloc(Math.ceil(size / 32) * 4 * size)])
}

const png = fs.readFileSync(shot)
const big = decode(png)
if (big.w !== 256 || big.h !== 256) throw new Error(`the screenshot is ${big.w}x${big.h}, expected 256x256`)
const images = [16, 24, 32, 48].map((s) => [s, bitmap(shrink(big, s), s)])
images.push([256, png])
const dir = Buffer.alloc(6 + images.length * 16)
dir.writeUInt16LE(1, 2)
dir.writeUInt16LE(images.length, 4)
let offset = dir.length
images.forEach(([size, data], i) => {
  const e = 6 + i * 16
  dir[e] = dir[e + 1] = size & 255
  dir.writeUInt16LE(1, e + 4)
  dir.writeUInt16LE(32, e + 6)
  dir.writeUInt32LE(data.length, e + 8)
  dir.writeUInt32LE(offset, e + 12)
  offset += data.length
})
fs.mkdirSync(path.join(root, 'tray'), { recursive: true })
fs.writeFileSync(path.join(root, 'tray', 'pitglass.ico'), Buffer.concat([dir, ...images.map((i) => i[1])]))
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`tray/pitglass.ico: ${offset} bytes`)
