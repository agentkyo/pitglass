// A piece of the PC screen as a PNG: how the game's own GPS (or any minimap) gets to a second
// device. The game draws it, PitGlass copies that rectangle of the desktop. Windows only (GDI
// through koffi); works for games in a window or borderless, not in exclusive fullscreen.
import koffi from 'koffi'
import zlib from 'node:zlib'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Gdi {
  GetDC(wnd: unknown): unknown
  ReleaseDC(wnd: unknown, dc: unknown): number
  GetSystemMetrics(i: number): number
  CreateCompatibleDC(dc: unknown): unknown
  CreateCompatibleBitmap(dc: unknown, w: number, h: number): unknown
  SelectObject(dc: unknown, obj: unknown): unknown
  SetStretchBltMode(dc: unknown, mode: number): number
  StretchBlt(dst: unknown, x: number, y: number, w: number, h: number, src: unknown, sx: number, sy: number, sw: number, sh: number, rop: number): number
  GetDIBits(dc: unknown, bmp: unknown, start: number, lines: number, bits: Buffer, info: Buffer, usage: number): number
  DeleteObject(obj: unknown): number
  DeleteDC(dc: unknown): number
}

let gdi: Gdi | null | undefined

function api(): Gdi | null {
  if (gdi !== undefined) return gdi
  if (process.platform !== 'win32') return (gdi = null)
  try {
    const u = koffi.load('user32.dll')
    const g = koffi.load('gdi32.dll')
    // without this, a scaled display hands out stretched coordinates
    try {
      u.func('int __stdcall SetProcessDPIAware()')()
    } catch {
      /* older Windows */
    }
    gdi = {
      GetDC: u.func('void* __stdcall GetDC(void* wnd)'),
      ReleaseDC: u.func('int __stdcall ReleaseDC(void* wnd, void* dc)'),
      GetSystemMetrics: u.func('int __stdcall GetSystemMetrics(int index)'),
      CreateCompatibleDC: g.func('void* __stdcall CreateCompatibleDC(void* dc)'),
      CreateCompatibleBitmap: g.func('void* __stdcall CreateCompatibleBitmap(void* dc, int w, int h)'),
      SelectObject: g.func('void* __stdcall SelectObject(void* dc, void* obj)'),
      SetStretchBltMode: g.func('int __stdcall SetStretchBltMode(void* dc, int mode)'),
      StretchBlt: g.func('int __stdcall StretchBlt(void* dst, int x, int y, int w, int h, void* src, int sx, int sy, int sw, int sh, uint32_t rop)'),
      GetDIBits: g.func('int __stdcall GetDIBits(void* dc, void* bmp, uint32_t start, uint32_t lines, void* bits, void* info, uint32_t usage)'),
      DeleteObject: g.func('int __stdcall DeleteObject(void* obj)'),
      DeleteDC: g.func('int __stdcall DeleteDC(void* dc)')
    } as Gdi
  } catch {
    gdi = null
  }
  return gdi
}

/** The whole desktop, all monitors: its top-left corner can be negative. */
export function desktop(): Rect | null {
  const a = api()
  if (!a) return null
  const r = { x: a.GetSystemMetrics(76), y: a.GetSystemMetrics(77), w: a.GetSystemMetrics(78), h: a.GetSystemMetrics(79) }
  return r.w > 0 && r.h > 0 ? r : null
}

/** A rectangle that lies inside the desktop, or null when nothing is left of it. */
export function clip(r: Rect, d: Rect): Rect | null {
  const x = Math.max(r.x, d.x)
  const y = Math.max(r.y, d.y)
  const w = Math.min(r.x + r.w, d.x + d.w) - x
  const h = Math.min(r.y + r.h, d.y + d.h) - y
  return w >= 8 && h >= 8 ? { x, y, w, h } : null
}

/** 8-bit RGB PNG from top-down BGRA pixels. */
export function encodePng(bgra: Buffer, w: number, h: number): Buffer {
  const raw = Buffer.allocUnsafe((w * 3 + 1) * h)
  let o = 0
  let i = 0
  for (let y = 0; y < h; y++) {
    raw[o++] = 0
    for (let x = 0; x < w; x++, i += 4) {
      raw[o++] = bgra[i + 2]
      raw[o++] = bgra[i + 1]
      raw[o++] = bgra[i]
    }
  }
  const chunk = (type: string, body: Buffer) => {
    const out = Buffer.allocUnsafe(12 + body.length)
    out.writeUInt32BE(body.length, 0)
    out.write(type, 4, 'latin1')
    body.copy(out, 8)
    out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + body.length)) >>> 0, 8 + body.length)
    return out
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(w, 0)
  head.writeUInt32BE(h, 4)
  head[8] = 8
  head[9] = 2
  // fast compression: this runs several times a second
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0))])
}

// ---- JPEG through GDI+ (a photo-like map is five times smaller than as PNG). GDI+ writes to a COM
// stream; its methods are called through the object's function table.
interface Plus {
  fromBitmap(bmp: unknown, pal: unknown, out: unknown[]): number
  save(image: unknown, stream: unknown, clsid: Buffer, params: unknown): number
  dispose(image: unknown): number
  newStream(mem: unknown, del: number, out: unknown[]): number
  memOf(stream: unknown, out: unknown[]): number
  lock(mem: unknown): unknown
  unlock(mem: unknown): number
  size(mem: unknown): number
}
let plus: Plus | null | undefined
const RELEASE = koffi.proto('uint32_t __stdcall PitGlassComRelease(void* self)')

function gdiplus(): Plus | null {
  if (plus !== undefined) return plus
  try {
    const gp = koffi.load('gdiplus.dll')
    const ole = koffi.load('ole32.dll')
    const k32 = koffi.load('kernel32.dll')
    const startup = Buffer.alloc(24)
    startup.writeUInt32LE(1, 0)
    const token = [0n]
    if (gp.func('int __stdcall GdiplusStartup(_Out_ uintptr_t* token, void* input, void* output)')(token, startup, null) !== 0) return (plus = null)
    plus = {
      fromBitmap: gp.func('int __stdcall GdipCreateBitmapFromHBITMAP(void* bmp, void* pal, _Out_ void** out)'),
      save: gp.func('int __stdcall GdipSaveImageToStream(void* image, void* stream, void* clsid, void* params)'),
      dispose: gp.func('int __stdcall GdipDisposeImage(void* image)'),
      newStream: ole.func('int __stdcall CreateStreamOnHGlobal(void* mem, int deleteOnRelease, _Out_ void** out)'),
      memOf: ole.func('int __stdcall GetHGlobalFromStream(void* stream, _Out_ void** out)'),
      lock: k32.func('void* __stdcall GlobalLock(void* mem)'),
      unlock: k32.func('int __stdcall GlobalUnlock(void* mem)'),
      size: k32.func('size_t __stdcall GlobalSize(void* mem)')
    } as Plus
  } catch {
    plus = null
  }
  return plus
}

// {557CF401-1A04-11D3-9A73-0000F81EF32E}: the JPEG encoder that ships with Windows
const JPEG = Buffer.from('01f47c55041ad3119a730000f81ef32e', 'hex')

/** JPEG of a GDI bitmap, or null when GDI+ is not there (the caller falls back to PNG). */
function jpegOf(bmp: unknown): Buffer | null {
  const p = gdiplus()
  if (!p) return null
  const image: unknown[] = [null]
  if (p.fromBitmap(bmp, null, image) !== 0 || !image[0]) return null
  const stream: unknown[] = [null]
  try {
    if (p.newStream(null, 1, stream) !== 0 || !stream[0]) return null
    if (p.save(image[0], stream[0], JPEG, null) !== 0) return null
    const mem: unknown[] = [null]
    if (p.memOf(stream[0], mem) !== 0 || !mem[0]) return null
    const at = p.lock(mem[0])
    if (!at) return null
    try {
      const all = Buffer.from(koffi.view(at, Number(p.size(mem[0]))))
      // the memory block can be larger than the picture: a JPEG ends at its last FF D9
      const end = all.lastIndexOf(Buffer.from([0xff, 0xd9]))
      return end > 0 ? Buffer.from(all.subarray(0, end + 2)) : null
    } finally {
      p.unlock(mem[0])
    }
  } finally {
    p.dispose(image[0])
    // IUnknown::Release is the third entry of the stream's function table; it frees the memory too
    if (stream[0]) koffi.call(koffi.decode(koffi.decode(stream[0], 'void*'), 2 * 8, 'void*'), RELEASE, stream[0])
  }
}

/** Copy a rectangle of the desktop, scaled down to at most `maxW` pixels wide. JPEG when Windows can make one, PNG otherwise. */
export function capture(rect: Rect, maxW: number, format: 'jpeg' | 'png' = 'jpeg'): { data: Buffer; type: string; w: number; h: number } | null {
  const a = api()
  const d = desktop()
  if (!a || !d) return null
  const r = clip(rect, d)
  if (!r) return null
  const scale = Math.min(1, maxW / r.w)
  const w = Math.max(1, Math.round(r.w * scale))
  const h = Math.max(1, Math.round(r.h * scale))
  const screen = a.GetDC(null)
  if (!screen) return null
  const mem = a.CreateCompatibleDC(screen)
  const bmp = a.CreateCompatibleBitmap(screen, w, h)
  const old = a.SelectObject(mem, bmp)
  try {
    a.SetStretchBltMode(mem, 4) // HALFTONE: averaged, readable when shrunk
    if (!a.StretchBlt(mem, 0, 0, w, h, screen, r.x, r.y, r.w, r.h, 0x40cc0020)) return null // SRCCOPY | CAPTUREBLT
    a.SelectObject(mem, old)
    if (format === 'jpeg') {
      let jpg: Buffer | null = null
      try {
        jpg = jpegOf(bmp)
      } catch {
        plus = null
      }
      if (jpg) return { data: jpg, type: 'image/jpeg', w, h }
    }
    const info = Buffer.alloc(40)
    info.writeUInt32LE(40, 0)
    info.writeInt32LE(w, 4)
    info.writeInt32LE(-h, 8) // top-down
    info.writeUInt16LE(1, 12)
    info.writeUInt16LE(32, 14)
    const bits = Buffer.allocUnsafe(w * h * 4)
    if (a.GetDIBits(mem, bmp, 0, h, bits, info, 0) !== h) return null
    return { data: encodePng(bits, w, h), type: 'image/png', w, h }
  } finally {
    a.SelectObject(mem, old)
    a.DeleteObject(bmp)
    a.DeleteDC(mem)
    a.ReleaseDC(null, screen)
  }
}
