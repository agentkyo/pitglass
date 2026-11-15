// Draws one page of a layout into an element and keeps it fed with telemetry.
import type { Frame } from '../../src/shared/channels.ts'
import type { Layout, Widget } from '../../src/shared/types.ts'
import { el } from './core.ts'
import { WIDGET, type Ctx, type Inst } from './widgets.ts'

/** Sample data for previews when no game is running. */
export const SAMPLE: Record<string, Frame> = {
  car: {
    game: 'ac', vehicle: 'Porsche 911 GT3 R', track: 'Imola', speed: 187, rpm: 7350, rpmMax: 8500, rpmPct: 0.865, gear: '4', throttle: 1, brake: 0, clutch: 0, steer: -0.12,
    fuel: 41.3, fuelMax: 120, fuelPct: 0.34, position: 3, lap: 5, lapsTotal: 12, lapCurrent: '1:02.418', lapLast: '1:39.038', lapBest: '1:38.412', sector: 2,
    tyreFL: 84, tyreFR: 97, tyreRL: 79, tyreRR: 81, tc: false, abs: false, pitLimiter: false, inPit: false, brakeBias: 56.5, airTemp: 18, roadTemp: 27,
    waterTemp: 92, oilTemp: 104, turbo: 0.8, blinkL: false, blinkR: true, highBeam: true, handbrake: false, shiftLight: false
  },
  truck: {
    game: 'ets2', vehicle: 'Scania S', speed: 84, rpm: 1180, rpmMax: 2500, rpmPct: 0.47, gear: '12', throttle: 0.4, brake: 0, cruise: 80, cruiseOn: true, speedLimit: 80, overLimit: true,
    fuel: 612, fuelMax: 900, fuelPct: 0.68, fuelRange: 1890, adblue: 61, waterTemp: 86, oilTemp: 97, retarder: 2, retarderMax: 4, engineBrake: true,
    blinkL: true, blinkR: false, lowBeam: true, highBeam: false, beacon: false, wipers: false, handbrake: false, airWarn: false, fuelWarn: false, trailer: true,
    truckDamage: 0.03, cargoDamage: 0, onJob: true, cargo: 'Tractors', origin: 'Berlin', destination: 'Praha', jobDistance: 352, income: 18450,
    deadline: '6h50', restStop: '6h05', gameClock: 'Tue 08:14'
  },
  plane: {
    game: 'msfs', vehicle: 'Cessna 172', altitude: 5500, ias: 118, groundSpeed: 124, vs: 40, heading: 268, pitch: 2.5, bank: -12, lat: -22.84, lon: -43.17,
    flaps: 0, gearDown: true, onGround: false, handbrake: false, throttle: 0.72, rpm: 2350, fuel: 148, fuelMax: 212, baro: 29.92, com1: 118.7,
    windDir: 140, windSpeed: 9, wpDistance: 12.4, wpEte: '0:06', lightLanding: false, lightTaxi: false, lightNav: true, lightStrobe: true, beacon: true,
    apMaster: true, apHdg: true, apHdgSel: 270, apAlt: true, apAltSel: 5500, apVs: false, apVsSel: 0, apNav: false, apApr: false
  }
}
SAMPLE.any = SAMPLE.car

interface Slot {
  w: Widget
  box: HTMLElement
  inst: Inst
}

export class Stage {
  el: HTMLElement
  private slots: Slot[] = []
  private w = 0
  private h = 0

  layout: Layout
  page: number
  private host: HTMLElement

  constructor(host: HTMLElement, layout: Layout, page: number, ctx: Ctx) {
    this.host = host
    this.layout = layout
    this.page = page
    const s = (this.el = el('div', 'stage'))
    const th = layout.theme
    s.style.setProperty('--bg', th.bg)
    s.style.setProperty('--panel', th.panel)
    s.style.setProperty('--text', th.text)
    s.style.setProperty('--dim', th.dim)
    s.style.setProperty('--accent', th.accent)
    const pg = layout.pages[Math.min(page, layout.pages.length - 1)]
    for (const w of pg ? pg.widgets : []) {
      const def = WIDGET[w.type]
      if (!def) continue
      const box = el('div', 'w')
      box.style.left = `${(w.x / layout.cols) * 100}%`
      box.style.top = `${(w.y / layout.rows) * 100}%`
      box.style.width = `${(w.w / layout.cols) * 100}%`
      box.style.height = `${(w.h / layout.rows) * 100}%`
      let inst: Inst
      try {
        inst = def.make(w, ctx)
      } catch {
        continue
      }
      box.appendChild(inst.el)
      s.appendChild(box)
      this.slots.push({ w, box, inst })
    }
    host.appendChild(s)
    this.resize()
  }

  /** Call when the host element changed size. */
  resize() {
    const W = this.el.clientWidth
    const H = this.el.clientHeight
    if (!W || !H || (W === this.w && H === this.h)) return
    this.w = W
    this.h = H
    const gap = Math.max(1.5, Math.min(W, H) * 0.006)
    this.el.style.setProperty('--gap', `${gap}px`)
    this.el.style.setProperty('--radius', `${Math.max(3, Math.min(W, H) * 0.022)}px`)
    const cw = W / this.layout.cols
    const chh = H / this.layout.rows
    for (const s of this.slots) if (s.inst.size) s.inst.size(s.w.w * cw - gap * 2, s.w.h * chh - gap * 2)
  }

  update(f: Frame) {
    for (const s of this.slots) s.inst.update(f)
  }

  destroy() {
    for (const s of this.slots) if (s.inst.destroy) s.inst.destroy()
    if (this.el.parentNode === this.host) this.host.removeChild(this.el)
    this.slots = []
  }
}
