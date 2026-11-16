// The track map: where the vehicle has been, drawn by driving. The hub's position (posX/posZ, in
// metres) is thinned into a path that every screen can ask for, so a tablet that connects halfway
// through a race gets the whole track. Assetto Corsa also ships a drawing of each track
// (map.png + data/map.ini in the track folder): when it is found, screens draw that under the path.
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { Frame } from '../shared/channels.ts'

const MAX_POINTS = 4000
const JUMP_M = 400

export interface TrackImage {
  file: string
  /** world metres per pixel, and the world position of the picture's top-left corner */
  scale: number
  x0: number
  z0: number
  w: number
  h: number
}

export interface TrailData {
  /** changes when the path starts over (another game or track) */
  key: string
  /** minimum distance between two points, metres */
  step: number
  /** flat x,z,x,z... runs; a new run starts after a teleport */
  segs: number[][]
  image: Omit<TrackImage, 'file'> | null
}

/** PNG width and height from the header. */
function pngSize(file: string): [number, number] | null {
  try {
    const fd = fs.openSync(file, 'r')
    const head = Buffer.alloc(24)
    fs.readSync(fd, head, 0, 24, 0)
    fs.closeSync(fd)
    return head.toString('latin1', 1, 4) === 'PNG' ? [head.readUInt32BE(16), head.readUInt32BE(20)] : null
  } catch {
    return null
  }
}

/** Read a track folder's map.png + data/map.ini. `dir` is the track (or track layout) folder. */
export function readTrackImage(dir: string): TrackImage | null {
  try {
    const file = path.join(dir, 'map.png')
    const ini = fs.readFileSync(path.join(dir, 'data', 'map.ini'), 'utf8')
    const get = (k: string) => Number(new RegExp(`^\\s*${k}\\s*=\\s*(-?[\\d.]+)`, 'mi').exec(ini)?.[1])
    const scale = get('SCALE_FACTOR')
    const x0 = -get('X_OFFSET')
    const z0 = -get('Z_OFFSET')
    const size = pngSize(file)
    if (!size || !(scale > 0) || !isFinite(x0) || !isFinite(z0)) return null
    return { file, scale, x0, z0, w: size[0], h: size[1] }
  } catch {
    return null
  }
}

let steamLibs: Promise<string[]> | null = null
/** Steam library folders (asked once: the registry for Steam's path, then libraryfolders.vdf). */
function steamLibraries(): Promise<string[]> {
  return (steamLibs ??= new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([])
    execFile('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { windowsHide: true }, (err, out) => {
      const root = /SteamPath\s+REG_SZ\s+(.+)/.exec(err ? '' : out)?.[1].trim()
      if (!root) return resolve([])
      const libs = [root]
      try {
        const vdf = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8')
        for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libs.push(m[1].replace(/\\\\/g, '\\'))
      } catch {
        /* a single library */
      }
      resolve([...new Set(libs.map((l) => path.normalize(l).toLowerCase()))])
    })
  }))
}

/** A folder name read from the game's memory: nothing that could walk out of the tracks folder. */
export const safeName = (name: unknown): string => (typeof name === 'string' && /^[\w .()+-]{1,80}$/.test(name) && !name.includes('..') ? name : '')

async function acTrackImage(track: string, config: string): Promise<TrackImage | null> {
  if (!track) return null
  for (const lib of await steamLibraries()) {
    const dir = path.join(lib, 'steamapps', 'common', 'assettocorsa', 'content', 'tracks', track)
    const img = (config && readTrackImage(path.join(dir, config))) || readTrackImage(dir)
    if (img) return img
  }
  return null
}

export class Trail {
  private key = ''
  private step = 3
  private segs: number[][] = []
  private n = 0
  private lastX = NaN
  private lastZ = NaN
  image: TrackImage | null = null

  /** Called on every hub tick with the current frame. */
  feed(game: string | null, f: Frame) {
    const key = game ? `${game}|${f.track ?? ''}|${f.trackConfig ?? ''}` : ''
    if (key !== this.key) {
      this.key = key
      this.step = 3
      this.segs = []
      this.n = 0
      this.lastX = this.lastZ = NaN
      this.image = null
      if (game === 'ac') void acTrackImage(safeName(f.track), safeName(f.trackConfig)).then((img) => (this.key === key ? (this.image = img) : null))
    }
    const x = f.posX
    const z = f.posZ
    if (typeof x !== 'number' || typeof z !== 'number') return
    const d = Math.hypot(x - this.lastX, z - this.lastZ)
    if (d < this.step) return
    // a jump (teleport to the pits, a new truck, fast travel) starts a new run instead of a straight line
    if (!(d < JUMP_M) || !this.segs.length) this.segs.push([])
    this.segs[this.segs.length - 1].push(x, z)
    this.lastX = x
    this.lastZ = z
    if (++this.n > MAX_POINTS) this.thin()
  }

  /** Too many points: keep every other one and space the next ones twice as far apart. */
  private thin() {
    this.step *= 2
    this.segs = this.segs.map((s) => s.filter((_, i) => (i >> 1) % 2 === 0)).filter((s) => s.length >= 4)
    this.n = 0
    for (const s of this.segs) this.n += s.length / 2
  }

  data(): TrailData {
    const im = this.image
    return { key: this.key, step: this.step, segs: this.segs, image: im ? { scale: im.scale, x0: im.x0, z0: im.z0, w: im.w, h: im.h } : null }
  }
}
