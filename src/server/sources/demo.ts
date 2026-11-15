// Fake but plausible telemetry, to try and draw layouts without a game running.
import { fmtDuration, fmtLap, type Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'
import { round, type Source } from './source.ts'

export type DemoKind = 'off' | 'car' | 'truck' | 'plane'

function car(t: number): Frame {
  const pull = 5.5 // seconds per gear
  const cyc = (t % pull) / pull
  const step = Math.floor(t / pull) % 8
  const braking = step >= 6 // two "gears" of braking for a corner
  const gear = braking ? 5 - (step - 6) * 2 - Math.floor(cyc * 2) : 2 + (step % 6 > 3 ? 3 : step % 6)
  const rpm = braking ? 7600 - 3000 * cyc : 4300 + 4050 * cyc ** 1.3
  const lapMs = (t * 1000 + 61_000) % 101_300
  const best = 98_412
  return {
    game: 'ac', vehicle: 'ks_porsche_911_gt3_r_2016', track: 'imola', paused: false,
    throttle: braking ? 0 : Math.min(1, 0.7 + cyc), brake: braking ? 0.85 - 0.5 * cyc : 0, clutch: 0,
    fuel: round(41.3 - (t % 600) * 0.01, 1), fuelMax: 120, gear: String(Math.max(1, gear)), rpm: round(rpm), rpmMax: 8500,
    speed: round(braking ? 240 - 130 * cyc - (step - 6) * 40 : 70 + gear * 30 + 28 * cyc),
    tyreFL: round(84 + 5 * Math.sin(t / 5)), tyreFR: round(87 + 5 * Math.sin(t / 6)), tyreRL: round(79 + 4 * Math.sin(t / 7)), tyreRR: round(81 + 4 * Math.sin(t / 8)),
    tc: !braking && cyc < 0.08, abs: braking && cyc < 0.3, pitLimiter: false,
    airTemp: 18, roadTemp: 27, brakeBias: 56.5,
    waterTemp: round(91 + 3 * Math.sin(t / 11)), oilTemp: round(104 + 4 * Math.sin(t / 13)), turbo: round(braking ? 0.1 : Math.min(1.4, 0.3 + 1.3 * cyc), 2),
    blinkL: false, blinkR: false, highBeam: Math.floor(t) % 30 > 26, handbrake: false, oilWarn: false, batteryWarn: false,
    lap: 5 + Math.floor(t / 101.3), lapsTotal: 12, position: 3,
    lapCurrent: fmtLap(lapMs), lapLast: fmtLap(99_038), lapBest: fmtLap(best), bestMs: best,
    inPit: false, sector: Math.min(3, 1 + Math.floor(lapMs / 34_000))
  }
}

function truck(t: number): Frame {
  const speed = 82 + 7 * Math.sin(t / 6)
  const sig = Math.floor(t) % 22 < 4
  const clock = 8 * 60 + 14 + Math.floor(t / 3)
  return {
    game: 'ets2', vehicle: 'Scania S', paused: false,
    speed: round(speed), rpm: round(1180 + 90 * Math.sin(t / 3)), rpmMax: 2500, gear: '12',
    throttle: 0.42 + 0.1 * Math.sin(t / 4), brake: 0, clutch: 0,
    cruise: 80, cruiseOn: true, speedLimit: Math.floor(t / 40) % 2 ? 90 : 80,
    fuel: round(612 - (t % 900) * 0.05), fuelMax: 900, fuelRange: 1890, fuelWarn: false, adblue: 61,
    waterTemp: 86, oilTemp: 97, airWarn: false, handbrake: false, engineBrake: Math.floor(t) % 15 < 3,
    retarder: Math.floor(t) % 15 < 3 ? 2 : 0, retarderMax: 4,
    blinkL: sig && Math.floor(t * 2.6) % 2 === 0, blinkR: false, hazard: false,
    parkLights: true, lowBeam: true, highBeam: Math.floor(t) % 30 > 24, beacon: false, wipers: false,
    trailer: true, truckDamage: 0.03, cargoDamage: 0,
    onJob: true, cargo: 'Tractors', origin: 'Berlin', destination: 'Praha', jobDistance: 352, income: 18450,
    deadline: fmtDuration(410 - t / 3), restStop: fmtDuration(365 - t / 3),
    gameClock: `Tue ${String(Math.floor(clock / 60) % 24).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`
  }
}

function plane(t: number): Frame {
  // a wide left-hand orbit over Guanabara Bay, Rio de Janeiro
  const period = 240
  const a = (t / period) * Math.PI * 2
  const lat = -22.9 + 0.06 * Math.cos(a)
  const lon = -43.17 + 0.065 * Math.sin(a)
  const heading = ((((-a * 180) / Math.PI + 270) % 360) + 360) % 360
  return {
    game: 'msfs', vehicle: 'Cessna 172', paused: false,
    altitude: round(5500 + 14 * Math.sin(t / 3)), ias: round(118 + 2 * Math.sin(t / 5)), groundSpeed: round(124 + 3 * Math.sin(t / 9)),
    vs: Math.round((60 * Math.cos(t / 3)) / 10) * 10, heading: round(heading, 1),
    pitch: round(2.5 + 0.6 * Math.sin(t / 3), 1), bank: round(-12 + 1.5 * Math.sin(t / 4), 1),
    lat: round(lat, 5), lon: round(lon, 5), flaps: 0, gearDown: true, onGround: false, handbrake: false,
    spoilers: 0, throttle: 0.72, rpm: 2350, fuel: 148, fuelMax: 212, baro: 29.92, com1: 118.7,
    windDir: 140, windSpeed: 9, wpDistance: round(12.4 - (t % 300) * 0.03, 1), wpEte: '0:06',
    lightLanding: false, lightTaxi: false, lightNav: true, lightStrobe: true, beacon: true,
    apMaster: true, apHdg: Math.floor(t / 20) % 2 === 0, apHdgSel: 270, apAlt: true, apAltSel: 5500,
    apVs: false, apVsSel: 0, apNav: Math.floor(t / 20) % 2 === 1, apApr: false
  }
}

export class DemoSource implements Source {
  id = 'demo'
  private t0 = Date.now()

  private kind: () => DemoKind

  constructor(kind: () => DemoKind) {
    this.kind = kind
  }

  poll(now: number): Frame | null {
    const t = (now - this.t0) / 1000
    const k = this.kind()
    return k === 'car' ? car(t) : k === 'truck' ? truck(t) : k === 'plane' ? plane(t) : null
  }

  status(): SourceStatus {
    return { id: this.id, state: this.kind() === 'off' ? 'off' : 'on' }
  }

  stop() {}
}
