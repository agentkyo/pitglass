// Assetto Corsa and Assetto Corsa EVO: the game's own shared memory (no plugin needed).
// Fields are read by explicit offset: the structs mix wchar_t arrays and ints, and the padding
// between them is easy to get wrong with automatic struct mapping.
import { fmtLap, type Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'
import { SharedMemory, wstr } from '../win32.ts'
import { clamp01, round, type Source } from './source.ts'

const PHYSICS_SIZE = 800
const GRAPHICS_SIZE = 1600
const STATIC_SIZE = 820
const STALE_MS = 3000

const gearName = (raw: number) => (raw === 0 ? 'R' : raw === 1 ? 'N' : String(raw - 1))

/** Pure decoder (tests feed it synthetic buffers). Returns null when no session is live. */
export function decodeAc(ph: Buffer, gf: Buffer, st: Buffer): Frame | null {
  const status = gf.readInt32LE(4) // 0 off, 1 replay, 2 live, 3 pause
  const rpmMax = st.readInt32LE(412)
  if (status === 0 || !(rpmMax > 1000 && rpmMax < 30000)) return null
  const fuelMax = st.readFloatLE(416)
  return {
    game: 'ac',
    vehicle: wstr(st, 68, 33),
    track: wstr(st, 134, 33),
    trackConfig: wstr(st, 524, 33),
    posX: round(gf.readFloatLE(252), 1),
    posZ: round(gf.readFloatLE(260), 1),
    lapProgress: round(clamp01(gf.readFloatLE(248)), 3),
    paused: status === 3,
    throttle: clamp01(ph.readFloatLE(4)),
    brake: clamp01(ph.readFloatLE(8)),
    fuel: round(ph.readFloatLE(12), 1),
    fuelMax: round(fuelMax, 1),
    gear: gearName(ph.readInt32LE(16)),
    rpm: ph.readInt32LE(20),
    rpmMax,
    steer: round(Math.max(-1, Math.min(1, ph.readFloatLE(24))), 2),
    speed: round(ph.readFloatLE(28)),
    turbo: round(ph.readFloatLE(276), 2),
    tyreFL: round(ph.readFloatLE(152)),
    tyreFR: round(ph.readFloatLE(156)),
    tyreRL: round(ph.readFloatLE(160)),
    tyreRR: round(ph.readFloatLE(164)),
    tc: ph.readFloatLE(204) > 0,
    pitLimiter: ph.readInt32LE(248) !== 0,
    abs: ph.readFloatLE(252) > 0,
    airTemp: round(ph.readFloatLE(288)),
    roadTemp: round(ph.readFloatLE(292)),
    brakeBias: round(ph.readFloatLE(564) * 100, 1),
    lap: gf.readInt32LE(132) + 1,
    position: gf.readInt32LE(136),
    lapCurrent: fmtLap(gf.readInt32LE(140)),
    lapLast: fmtLap(gf.readInt32LE(144)),
    lapBest: fmtLap(gf.readInt32LE(148)),
    bestMs: gf.readInt32LE(148),
    inPit: gf.readInt32LE(160) !== 0,
    sector: gf.readInt32LE(164) + 1,
    lapsTotal: gf.readInt32LE(172)
  }
}

/** AC EVO shares the first physics fields; laps, position and names are not published yet. */
export function decodeEvo(ph: Buffer, gf: Buffer, top: { rpm: number }): Frame | null {
  const status = gf.readInt32LE(4)
  const rpm = ph.readInt32LE(20)
  if (status === 0 || !(rpm >= 0 && rpm < 30000)) return null
  const pct = gf.readFloatLE(72) // rpm as a fraction of the car's limit
  top.rpm = pct > 0.2 && pct <= 1.05 && rpm > 500 ? Math.round(rpm / pct) : Math.max(top.rpm, rpm)
  return {
    game: 'acevo',
    paused: status === 3,
    throttle: clamp01(ph.readFloatLE(4)),
    brake: clamp01(ph.readFloatLE(8)),
    fuel: round(ph.readFloatLE(12), 1),
    gear: gearName(ph.readInt32LE(16)),
    rpm,
    rpmMax: top.rpm || 8000,
    speed: round(ph.readFloatLE(28)),
    tyreFL: round(ph.readFloatLE(152)),
    tyreFR: round(ph.readFloatLE(156)),
    tyreRL: round(ph.readFloatLE(160)),
    tyreRR: round(ph.readFloatLE(164)),
    tc: ph.readFloatLE(204) > 0,
    pitLimiter: ph.readInt32LE(248) !== 0,
    abs: ph.readFloatLE(252) > 0
  }
}

export class AcSource implements Source {
  id = 'ac'
  private maps: SharedMemory[] | null = null
  private evo = false
  private top = { rpm: 0 }
  private nextOpen = 0
  private packet = -1
  private packetAt = 0
  private live = false

  private open(now: number) {
    if (now < this.nextOpen) return
    this.nextOpen = now + 2000
    const all = (specs: [string, number][]) => {
      const maps: SharedMemory[] = []
      for (const [name, size] of specs) {
        const m = SharedMemory.open(name, size)
        if (!m) {
          maps.forEach((x) => x.close())
          return null
        }
        maps.push(m)
      }
      return maps
    }
    this.maps = all([['Local\\acpmf_physics', PHYSICS_SIZE], ['Local\\acpmf_graphics', GRAPHICS_SIZE], ['Local\\acpmf_static', STATIC_SIZE]])
    this.evo = false
    if (!this.maps) {
      this.maps = all([['Local\\acevo_pmf_physics', PHYSICS_SIZE], ['Local\\acevo_pmf_graphics', GRAPHICS_SIZE]])
      this.evo = !!this.maps
    }
    this.packet = -1
    this.packetAt = now
  }

  private close() {
    this.maps?.forEach((m) => m.close())
    this.maps = null
    this.live = false
  }

  poll(now: number): Frame | null {
    if (!this.maps) this.open(now)
    if (!this.maps) return null
    const [ph, gf, st] = this.maps.map((m) => m.buf)
    const frame = this.evo ? decodeEvo(ph, gf, this.top) : decodeAc(ph, gf, st)
    // Our handle keeps the mapping of a closed game alive. The physics packet id moves on every
    // physics step while driving: if it stops outside pause/replay, the game is gone.
    const packet = ph.readInt32LE(0)
    if (packet !== this.packet) {
      this.packet = packet
      this.packetAt = now
    } else if (now - this.packetAt > STALE_MS && !(frame && frame.paused) && gf.readInt32LE(4) !== 1) {
      this.close()
      return null
    }
    this.live = !!frame
    return frame
  }

  status(): SourceStatus {
    return { id: this.id, state: this.live ? 'on' : 'off' }
  }

  stop() {
    this.close()
  }
}
