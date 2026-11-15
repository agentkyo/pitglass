// Games that push telemetry over UDP: BeamNG.drive (OutGauge) and Motor Town, plus the generic
// "drive" feed (steering, pedals and gear read from the wheel itself, MyWheel format).
//
// A UDP port has one owner. If another app (FreeDock, SimHub...) already listens on the game's
// port, the source reports "blocked" and keeps retrying, so it takes over when the port is free.
import dgram from 'node:dgram'
import type { Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'
import { clamp01, round, type Source } from './source.ts'

export const outGaugeGear = (g: number) => (g === 1 ? 'N' : g > 1 ? String(g - 1) : g === 0 ? 'R' : `R${1 - g}`)

/** LFS OutGauge packet as BeamNG sends it: 92 bytes (96 with the optional id). */
export function decodeOutGauge(p: Buffer): Frame | null {
  if (p.length < 92) return null
  const show = p.readUInt32LE(44)
  const on = (bit: number) => (show & bit) !== 0
  const left = on(1 << 5)
  const right = on(1 << 6)
  return {
    game: 'beamng',
    gear: outGaugeGear(p.readInt8(10)),
    speed: round(p.readFloatLE(12) * 3.6),
    rpm: round(p.readFloatLE(16)),
    turbo: round(p.readFloatLE(20), 2),
    waterTemp: round(p.readFloatLE(24)),
    fuelPct: clamp01(p.readFloatLE(28)),
    oilTemp: round(p.readFloatLE(36)),
    throttle: clamp01(p.readFloatLE(48)),
    brake: clamp01(p.readFloatLE(52)),
    clutch: clamp01(p.readFloatLE(56)),
    shiftLight: on(1 << 0),
    highBeam: on(1 << 1),
    handbrake: on(1 << 2),
    tc: on(1 << 4),
    blinkL: left,
    blinkR: right,
    hazard: left && right,
    oilWarn: on(1 << 8),
    batteryWarn: on(1 << 9),
    abs: on(1 << 10)
  }
}

/** Motor Town "Telemetry Data Output" (packet "MTTM", v1 and v1.1). */
export function decodeMotorTown(p: Buffer, now = Date.now()): Frame | null {
  if (p.length < 153 || p.toString('latin1', 0, 4) !== 'MTTM' || p[4] !== 1) return null
  if (p.length !== 8 + p.readUInt16LE(6)) return null
  const flags = p.readUInt32LE(145)
  const reverse = (flags & 0x04) !== 0
  const gear = p.readInt32LE(116)
  const f: Frame = {
    game: 'motortown',
    rpm: round(p.readFloatLE(108)),
    rpmMax: round(p.readFloatLE(112)),
    gear: reverse || gear < 0 ? 'R' : gear === 0 ? 'N' : String(gear),
    speed: round(p.readFloatLE(124)),
    throttle: clamp01(p.readFloatLE(128)),
    brake: clamp01(p.readFloatLE(132)),
    clutch: clamp01(p.readFloatLE(136)),
    steer: round(p.readFloatLE(140), 2),
    handbrake: p[144] !== 0,
    lowBeam: (flags & 0x08) !== 0,
    abs: (flags & 0x10) !== 0,
    tc: (flags & 0x20) !== 0,
    cruiseOn: (flags & 0x40) !== 0,
    fuelPct: clamp01(p.readFloatLE(149))
  }
  if (p.length >= 849) {
    // the game sends which side is on, not the blinking: blink it here
    const lit = Math.floor(now / 360) % 2 === 0
    const signal = p[158]
    f.blinkL = (signal === 1 || signal === 3) && lit
    f.blinkR = (signal === 2 || signal === 3) && lit
    f.hazard = signal === 3
    f.waterTemp = round(p.readFloatLE(166))
    f.cruise = round(p.readFloatLE(190))
    f.fuel = round(p.readFloatLE(202), 1)
    f.fuelMax = round(p.readFloatLE(206), 1)
    const limit = p.readFloatLE(230)
    f.speedLimit = limit > 0 ? round(limit) : null
    f.income = Number(p.readBigInt64LE(284))
    const end = p.indexOf(0, 753)
    f.vehicle = p.toString('utf8', 753, end >= 753 && end < 817 ? end : 817)
  }
  return f
}

/** MyWheel drive state: {"steer":-1..1,"throttle":0..1,"brake":0..1,"clutch":0..1,"gear":"3"|null} */
export function decodeDrive(p: Buffer): Frame | null {
  try {
    const v = JSON.parse(p.toString('utf8'))
    if (!v || typeof v !== 'object' || typeof v.throttle !== 'number') return null
    const f: Frame = { game: 'wheel', steer: Number(v.steer) || 0, throttle: clamp01(v.throttle), brake: clamp01(Number(v.brake) || 0), clutch: clamp01(Number(v.clutch) || 0) }
    if (typeof v.gear === 'string') f.gear = v.gear.slice(0, 2)
    return f
  } catch {
    return null
  }
}

export class UdpSource implements Source {
  private sock: dgram.Socket | null = null
  private frame: Frame | null = null
  private at = 0
  private blocked = false
  private retry: NodeJS.Timeout | null = null
  private stopped = false

  id: string
  private port: number
  private decode: (p: Buffer) => Frame | null
  private timeoutMs: number

  constructor(id: string, port: number, decode: (p: Buffer) => Frame | null, timeoutMs = 2500) {
    this.id = id
    this.port = port
    this.decode = decode
    this.timeoutMs = timeoutMs
    this.listen()
  }

  private listen() {
    if (this.stopped) return
    const sock = dgram.createSocket('udp4')
    sock.on('error', (e: NodeJS.ErrnoException) => {
      this.blocked = e.code === 'EADDRINUSE' || e.code === 'EACCES'
      try {
        sock.close()
      } catch {
        /* never bound */
      }
      this.sock = null
      this.retry = setTimeout(() => this.listen(), 5000)
    })
    sock.on('message', (msg, rinfo) => {
      if (rinfo.address !== '127.0.0.1') return
      const f = this.decode(msg)
      if (f) {
        this.frame = f
        this.at = Date.now()
      }
    })
    sock.bind(this.port, '127.0.0.1', () => {
      this.blocked = false
      this.sock = sock
    })
  }

  poll(now: number): Frame | null {
    return this.frame && now - this.at < this.timeoutMs ? this.frame : null
  }

  status(): SourceStatus {
    if (this.blocked) return { id: this.id, state: 'blocked', note: `UDP ${this.port}` }
    return { id: this.id, state: this.frame && Date.now() - this.at < this.timeoutMs ? 'on' : 'off' }
  }

  stop() {
    this.stopped = true
    if (this.retry) clearTimeout(this.retry)
    try {
      this.sock?.close()
    } catch {
      /* already closed */
    }
  }
}
