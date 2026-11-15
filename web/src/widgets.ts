// The widget library. Each widget builds its DOM once and then only touches what changed:
// telemetry arrives 30 times a second and the screen is often an old phone.
import { CHANNEL, type Frame, type Value } from '../../src/shared/channels.ts'
import type { Widget } from '../../src/shared/types.ts'
import { channelLabel, el, format, lang, range, tx } from './core.ts'

export interface Ctx {
  /** true in the editor: buttons do nothing */
  edit: boolean
  act(app: string, action: string, arg: string): void
}

export interface Inst {
  el: HTMLElement
  update(f: Frame): void
  /** inner size in pixels changed */
  size?(w: number, h: number): void
  destroy?(): void
}

export interface PropDef {
  key: string
  type: 'text' | 'number' | 'color' | 'bool' | 'select' | 'channel'
  label: [string, string]
  options?: string[]
}

export interface WidgetDef {
  type: string
  name: [string, string]
  /** default size in cells */
  w: number
  h: number
  /** kind of channel it binds to; undefined = none */
  ch?: 'num' | 'bool' | 'text' | 'any'
  defCh?: string
  props: PropDef[]
  make(w: Widget, ctx: Ctx): Inst
}

const SVG = 'http://www.w3.org/2000/svg'
const svg = (tag: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement => {
  const e = document.createElementNS(SVG, tag) as SVGElement
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  if (parent) parent.appendChild(e)
  return e
}
const str = (w: Widget, k: string, d = ''): string => (w.p && typeof w.p[k] === 'string' ? (w.p[k] as string) : d)
const num = (w: Widget, k: string, d: number): number => (w.p && typeof w.p[k] === 'number' ? (w.p[k] as number) : d)
const flag = (w: Widget, k: string, d = false): boolean => (w.p && typeof w.p[k] === 'boolean' ? (w.p[k] as boolean) : d)
const numOf = (v: Value | undefined): number | null => (typeof v === 'number' && isFinite(v) ? v : null)
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
/** font size that fits `chars` characters in a box */
const fit = (chars: number, w: number, h: number, ratio = 0.6) => Math.max(8, Math.floor(Math.min(h, w / (Math.max(1, chars) * ratio))))

const P_LABEL: PropDef = { key: 'label', type: 'text', label: ['Label', 'Rótulo'] }
const P_COLOR: PropDef = { key: 'color', type: 'color', label: ['Color', 'Cor'] }

// ---------------------------------------------------------------- icons (24x24, stroke)
export const ICONS: Record<string, string> = {
  left: '<path d="M3 12 11 5v4h10v6H11v4z" fill="currentColor" stroke="none"/>',
  right: '<path d="M21 12 13 5v4H3v6h10v4z" fill="currentColor" stroke="none"/>',
  high: '<path d="M13 5a7 7 0 0 1 0 14c-1.5 0-2-3-2-7s.5-7 2-7zM2 7h6M2 10.5h6M2 14h6M2 17.5h6"/>',
  low: '<path d="M13 5a7 7 0 0 1 0 14c-1.5 0-2-3-2-7s.5-7 2-7zM2 8.5l6-1.5M2 12l6-1.5M2 15.5l6-1.5M2 19l6-1.5"/>',
  park: '<circle cx="12" cy="12" r="8"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3M2.5 7a10 10 0 0 0 0 10M21.5 7a10 10 0 0 1 0 10"/>',
  hazard: '<path d="M12 3 22 20H2z"/><path d="M12 9 16.5 17h-9z"/>',
  beacon: '<path d="M7 18v-5a5 5 0 0 1 10 0v5M4 18h16v3H4zM12 2v2.5M4.5 5 6 6.8M19.5 5 18 6.8"/>',
  wiper: '<path d="M3 9a16 16 0 0 1 18 0l-2.5 8h-13zM12 17l4-9"/>',
  cruise: '<path d="M4 17a9 9 0 1 1 16 0M12 13l4-5"/><circle cx="12" cy="14" r="1.6" fill="currentColor"/><path d="M3 21h18"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6.5 7h5v4h-5zM14 9h2.5l2 2v7a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
  warn: '<path d="M12 3 22 20H2zM12 9.5v5"/><circle cx="12" cy="17.3" r="0.8" fill="currentColor"/>',
  bolt: '<path d="M3 8h18v10H3zM6 8V5.5h3V8M15 8V5.5h3V8M6 13h3M15 13h3M16.5 11.5v3"/>',
  plane: '<path d="M12 2c1 0 1.6 1.2 1.6 3v4l7.4 4.5v2L13.6 13v5l2.4 1.8V21L12 20l-4 1v-1.2L10.400 18v-5L3 15.500v-2L10.400 9V5c0-1.800.600-3 1.600-3z" fill="currentColor" stroke="none"/>',
  camera: '<path d="M3 7h4l1.500-2.500h7L17 7h4v12H3z"/><circle cx="12" cy="13" r="3.500"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  dot: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>'
}
export const icon = (name: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.dot}</svg>`

// ---------------------------------------------------------------- value
const value: WidgetDef = {
  type: 'value', name: ['Number', 'Número'], w: 5, h: 3, ch: 'any', defCh: 'speed',
  props: [
    P_LABEL, P_COLOR,
    { key: 'dec', type: 'number', label: ['Decimals', 'Casas decimais'] },
    { key: 'warnAbove', type: 'number', label: ['Alert above', 'Alerta acima de'] },
    { key: 'warnBelow', type: 'number', label: ['Alert below', 'Alerta abaixo de'] },
    { key: 'warn', type: 'channel', label: ['Alert when on', 'Alerta quando ligado'] }
  ],
  make(w) {
    const root = el('div', 'panel w-value')
    const head = el('div', 'lbl')
    const name = el('span', '', channelLabel(w))
    const unit = el('span', 'unit')
    head.appendChild(name)
    head.appendChild(unit)
    const val = el('div', 'val', '–')
    root.appendChild(head)
    root.appendChild(val)
    const color = str(w, 'color')
    if (color) val.style.color = color
    const dec = w.p && typeof w.p.dec === 'number' ? (w.p.dec as number) : undefined
    const above = num(w, 'warnAbove', NaN)
    const below = num(w, 'warnBelow', NaN)
    const warnCh = str(w, 'warn')
    let last: Value | undefined = undefined
    let lastUnit = ''
    let warned = false
    let len = 1
    let bw = 0
    let bh = 0
    const refit = () => {
      if (!bw) return
      const lh = clamp(bh * 0.2, 9, 15)
      head.style.fontSize = `${lh}px`
      val.style.fontSize = `${fit(Math.max(len, 2), bw - 22, (bh - lh * 1.2 - 8) * 0.84, 0.58)}px`
    }
    return {
      el: root,
      size(ww, hh) {
        bw = ww
        bh = hh
        refit()
      },
      update(f) {
        const v = w.ch ? f[w.ch] : undefined
        if (v !== last) {
          last = v
          const o = format(w.ch, v, dec)
          val.textContent = o.text
          if (o.unit !== lastUnit) unit.textContent = lastUnit = o.unit
          if (o.text.length !== len) {
            len = o.text.length
            refit()
          }
        }
        const n = numOf(v)
        const warn = (warnCh && f[warnCh] === true) || (n !== null && ((!isNaN(above) && n > above) || (!isNaN(below) && n < below)))
        if (warn !== warned) root.classList.toggle('warn', (warned = !!warn))
      }
    }
  }
}

// ---------------------------------------------------------------- gear
const gear: WidgetDef = {
  type: 'gear', name: ['Gear', 'Marcha'], w: 6, h: 6, ch: 'text', defCh: 'gear', props: [P_COLOR],
  make(w) {
    const root = el('div', 'panel w-gear')
    const val = el('div', 'val', 'N')
    root.appendChild(val)
    const color = str(w, 'color')
    if (color) val.style.color = color
    let last = ''
    let shift = false
    let bw = 0
    let bh = 0
    const refit = () => {
      if (bw) val.style.fontSize = `${fit(last.length || 1, bw * 0.9, bh * 0.98, 0.62)}px`
    }
    return {
      el: root,
      size(ww, hh) {
        bw = ww
        bh = hh
        refit()
      },
      update(f) {
        const raw = w.ch ? f[w.ch] : null
        const v = raw === null || raw === undefined ? '–' : String(raw)
        if (v !== last) {
          const relen = v.length !== last.length
          val.textContent = last = v
          if (relen) refit()
        }
        const s = f.shiftLight === true
        if (s !== shift) root.classList.toggle('shift', (shift = s))
      }
    }
  }
}

// ---------------------------------------------------------------- rpm shift bar
const rpm: WidgetDef = {
  type: 'rpm', name: ['Shift lights', 'Luzes de troca'], w: 24, h: 2, ch: 'num', defCh: 'rpmPct',
  props: [{ key: 'segments', type: 'number', label: ['Segments', 'Segmentos'] }, { key: 'from', type: 'number', label: ['Starts at (0-1)', 'Começa em (0-1)'] }],
  make(w) {
    const root = el('div', 'w-rpm')
    const count = clamp(Math.round(num(w, 'segments', Math.max(8, w.w))), 4, 40)
    const from = clamp(num(w, 'from', 0.35), 0, 0.9)
    const segs: HTMLElement[] = []
    for (let i = 0; i < count; i++) {
      const frac = i / count
      const s = el('i', frac >= 0.82 ? 'r' : frac >= 0.58 ? 'y' : 'g')
      root.appendChild(s)
      segs.push(s)
    }
    let lit = 0
    let shift = false
    return {
      el: root,
      update(f) {
        const [min, max] = range(w, f)
        const v = numOf(w.ch ? f[w.ch] : null)
        const frac = v === null ? 0 : clamp(((v - min) / (max - min) - from) / (1 - from), 0, 1)
        const n = Math.round(frac * count)
        if (n !== lit) {
          for (let i = Math.min(n, lit); i < Math.max(n, lit); i++) segs[i].classList.toggle('on', i < n)
          lit = n
        }
        const s = f.shiftLight === true
        if (s !== shift) root.classList.toggle('shift', (shift = s))
      }
    }
  }
}

// ---------------------------------------------------------------- bar
const bar: WidgetDef = {
  type: 'bar', name: ['Bar', 'Barra'], w: 6, h: 2, ch: 'num', defCh: 'throttle',
  props: [
    P_LABEL, P_COLOR,
    { key: 'dir', type: 'select', label: ['Direction', 'Direção'], options: ['h', 'v'] },
    { key: 'min', type: 'number', label: ['Minimum', 'Mínimo'] },
    { key: 'max', type: 'number', label: ['Maximum', 'Máximo'] },
    { key: 'center', type: 'bool', label: ['Grows from the center', 'Cresce a partir do centro'] }
  ],
  make(w) {
    const vertical = str(w, 'dir', 'h') === 'v'
    const center = flag(w, 'center')
    const root = el('div', `panel w-bar ${vertical ? 'v' : 'h'}${center ? ' c' : ''}`)
    const fill = el('div', 'fill')
    fill.style.background = str(w, 'color') || 'var(--accent)'
    root.appendChild(fill)
    const text = str(w, 'label')
    const lbl = text ? el('span', 'lbl', tx(text)) : null
    if (lbl) root.appendChild(lbl)
    let last = -9
    return {
      el: root,
      size(ww, hh) {
        if (lbl) lbl.style.fontSize = `${clamp(Math.min(ww, hh) * 0.42, 9, 22)}px`
      },
      update(f) {
        const [min, max] = range(w, f)
        const v = numOf(w.ch ? f[w.ch] : null)
        let frac = v === null ? 0 : clamp((v - min) / (max - min), 0, 1)
        if (center) frac = frac * 2 - 1
        frac = Math.round(frac * 200) / 200
        if (frac === last) return
        last = frac
        fill.style.transform = vertical ? `scaleY(${frac})` : `scaleX(${frac})`
      }
    }
  }
}

// ---------------------------------------------------------------- gauge
const ARC = 270
const polar = (deg: number, r: number): [number, number] => {
  const a = ((deg - 225) * Math.PI) / 180
  return [50 + r * Math.cos(a), 52 + r * Math.sin(a)]
}
const arc = (from: number, to: number, r: number): string => {
  const [x1, y1] = polar(from * ARC, r)
  const [x2, y2] = polar(to * ARC, r)
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${(to - from) * ARC > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

const gauge: WidgetDef = {
  type: 'gauge', name: ['Gauge', 'Mostrador'], w: 7, h: 7, ch: 'num', defCh: 'rpm',
  props: [
    P_LABEL, P_COLOR,
    { key: 'min', type: 'number', label: ['Minimum', 'Mínimo'] },
    { key: 'max', type: 'number', label: ['Maximum', 'Máximo'] },
    { key: 'redFrom', type: 'number', label: ['Red zone from (0-1)', 'Faixa vermelha a partir de (0-1)'] },
    { key: 'dec', type: 'number', label: ['Decimals', 'Casas decimais'] }
  ],
  make(w) {
    const root = el('div', 'panel w-gauge')
    const s = svg('svg', { viewBox: '0 0 100 100' })
    svg('path', { d: arc(0, 1, 40), class: 'track' }, s)
    const red = num(w, 'redFrom', NaN)
    if (red > 0 && red < 1) svg('path', { d: arc(red, 1, 46.5), class: 'red' }, s)
    const fill = svg('path', { d: arc(0, 1, 40), class: 'fill', pathLength: 100, 'stroke-dasharray': '0 100' }, s)
    const color = str(w, 'color')
    if (color) fill.style.stroke = color
    const val = svg('text', { x: 50, y: 59, class: 'val' }, s)
    const unit = svg('text', { x: 50, y: 72, class: 'unit' }, s)
    const name = svg('text', { x: 50, y: 93, class: 'name' }, s)
    name.textContent = channelLabel(w).toUpperCase()
    root.appendChild(s)
    const dec = w.p && typeof w.p.dec === 'number' ? (w.p.dec as number) : undefined
    let lastV: Value | undefined = undefined
    let lastDash = -1
    let lastUnit = ''
    let hot = false
    return {
      el: root,
      update(f) {
        const raw = w.ch ? f[w.ch] : undefined
        const [min, max] = range(w, f)
        const v = numOf(raw)
        const frac = v === null ? 0 : clamp((v - min) / (max - min), 0, 1)
        const dash = Math.round(frac * 400) / 4
        if (dash !== lastDash) fill.setAttribute('stroke-dasharray', `${(lastDash = dash)} 100`)
        if (raw !== lastV) {
          lastV = raw
          const o = format(w.ch, raw, dec)
          val.textContent = o.text
          val.setAttribute('font-size', o.text.length > 4 ? '18' : '25')
          if (o.unit !== lastUnit) unit.textContent = lastUnit = o.unit
        }
        const h = red > 0 && frac >= red
        if (h !== hot) root.classList.toggle('hot', (hot = h))
      }
    }
  }
}

// ---------------------------------------------------------------- lamp
const lamp: WidgetDef = {
  type: 'lamp', name: ['Indicator light', 'Luz indicadora'], w: 2, h: 2, ch: 'bool', defCh: 'highBeam',
  props: [P_LABEL, { key: 'icon', type: 'select', label: ['Icon', 'Ícone'], options: [''].concat(Object.keys(ICONS)) }, P_COLOR, { key: 'invert', type: 'bool', label: ['Lit when off', 'Acende quando desligado'] }],
  make(w) {
    const root = el('div', 'panel w-lamp')
    root.style.setProperty('--on', str(w, 'color') || 'var(--accent)')
    const ic = str(w, 'icon')
    const text = tx(str(w, 'label')) || (ic ? '' : channelLabel(w))
    const body = el('div', 'body')
    if (ic) body.innerHTML = icon(ic)
    const lbl = text ? el('span', '', text) : null
    if (lbl) body.appendChild(lbl)
    root.appendChild(body)
    const invert = flag(w, 'invert')
    let on: boolean | null = null
    return {
      el: root,
      size(ww, hh) {
        const s = Math.min(ww, hh)
        if (ic) (body.firstChild as SVGElement).style.width = `${Math.floor(s * (lbl ? 0.5 : 0.72))}px`
        if (lbl) lbl.style.fontSize = `${ic ? clamp(s * 0.2, 8, 16) : fit(Math.max(text.length, 4), ww * 0.86, hh * 0.5, 0.64)}px`
      },
      update(f) {
        const v = w.ch ? f[w.ch] : null
        const lit = (v === true || (typeof v === 'number' && v > 0)) !== invert
        if (lit !== on) root.classList.toggle('on', (on = lit))
      }
    }
  }
}

// ---------------------------------------------------------------- text
const text: WidgetDef = {
  type: 'text', name: ['Text', 'Texto'], w: 8, h: 2, ch: 'any',
  props: [P_LABEL, { key: 'text', type: 'text', label: ['Fixed text', 'Texto fixo'] }, P_COLOR, { key: 'dimText', type: 'bool', label: ['Dim', 'Apagado'] }, { key: 'bare', type: 'bool', label: ['No panel', 'Sem painel'] }],
  make(w) {
    const fixed = str(w, 'text')
    const root = el('div', `${flag(w, 'bare') || (fixed && !w.ch) ? '' : 'panel '}w-text${flag(w, 'dimText') ? ' dim' : ''}`)
    const label = str(w, 'label') ? tx(str(w, 'label')) : w.ch && !fixed ? channelLabel(w) : ''
    const head = label ? el('div', 'lbl', label) : null
    if (head) root.appendChild(head)
    const val = el('div', 'val', fixed ? tx(fixed) : '–')
    if (str(w, 'color')) val.style.color = str(w, 'color')
    root.appendChild(val)
    let last: Value | undefined = undefined
    let len = val.textContent!.length
    let bw = 0
    let bh = 0
    const refit = () => {
      if (!bw) return
      const lh = head ? clamp(bh * 0.2, 9, 15) : 0
      if (head) head.style.fontSize = `${lh}px`
      val.style.fontSize = `${fit(Math.max(len, 4), bw - 22, (bh - lh * 1.3 - 8) * 0.7, 0.52)}px`
    }
    return {
      el: root,
      size(ww, hh) {
        bw = ww
        bh = hh
        refit()
      },
      update(f) {
        if (!w.ch) return
        const v = f[w.ch]
        if (v === last) return
        last = v
        const s = format(w.ch, v).text
        val.textContent = s
        if (s.length !== len) {
          len = s.length
          refit()
        }
      }
    }
  }
}

// ---------------------------------------------------------------- clock
const clock: WidgetDef = {
  type: 'clock', name: ['Clock', 'Relógio'], w: 5, h: 3,
  props: [{ key: 'seconds', type: 'bool', label: ['Seconds', 'Segundos'] }, { key: 'date', type: 'bool', label: ['Date', 'Data'] }, P_COLOR],
  make(w) {
    const root = el('div', 'panel w-clock')
    const val = el('div', 'val')
    const date = flag(w, 'date') ? el('div', 'date') : null
    root.appendChild(val)
    if (date) root.appendChild(date)
    if (str(w, 'color')) val.style.color = str(w, 'color')
    const secs = flag(w, 'seconds')
    let last = ''
    const two = (n: number) => (n < 10 ? `0${n}` : String(n))
    return {
      el: root,
      size(ww, hh) {
        const fs = fit(secs ? 8 : 5, ww * 0.9, hh * (date ? 0.62 : 0.8), 0.56)
        val.style.fontSize = `${fs}px`
        if (date) date.style.fontSize = `${Math.max(9, fs * 0.24)}px`
      },
      update() {
        const d = new Date()
        const s = `${two(d.getHours())}:${two(d.getMinutes())}${secs ? `:${two(d.getSeconds())}` : ''}`
        if (s === last) return
        val.textContent = last = s
        if (date) date.textContent = d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      }
    }
  }
}

// ---------------------------------------------------------------- tyres
const tyreColor = (c: number | null): string => (c === null ? '' : c < 60 ? '#2563eb' : c < 75 ? '#0891b2' : c < 96 ? '#16a34a' : c < 106 ? '#d97706' : '#dc2626')

const tyres: WidgetDef = {
  type: 'tyres', name: ['Tyre temperatures', 'Temperatura dos pneus'], w: 6, h: 5, props: [],
  make() {
    const root = el('div', 'panel w-tyres')
    const keys = ['tyreFL', 'tyreFR', 'tyreRL', 'tyreRR']
    const cells = keys.map(() => root.appendChild(el('div', 't', '–')))
    const last: (Value | undefined)[] = []
    return {
      el: root,
      size(ww, hh) {
        root.style.fontSize = `${fit(4, ww * 0.42, hh * 0.3, 0.6)}px`
      },
      update(f) {
        keys.forEach((k, i) => {
          const v = f[k]
          if (v === last[i]) return
          last[i] = v
          const n = numOf(v)
          cells[i].textContent = n === null ? '–' : `${format(k, n).text}°`
          cells[i].style.background = tyreColor(n)
        })
      }
    }
  }
}

// ---------------------------------------------------------------- speed limit sign
const limit: WidgetDef = {
  type: 'limit', name: ['Speed limit sign', 'Placa de limite'], w: 4, h: 4, ch: 'num', defCh: 'speedLimit', props: [],
  make(w) {
    const root = el('div', 'w-limit')
    const s = svg('svg', { viewBox: '0 0 100 100' })
    svg('circle', { cx: 50, cy: 50, r: 44, class: 'ring' }, s)
    const val = svg('text', { x: 50, y: 63, class: 'val' }, s)
    root.appendChild(s)
    let last: Value | undefined = 0
    let over = false
    return {
      el: root,
      update(f) {
        const v = w.ch ? f[w.ch] : null
        if (v !== last) {
          last = v
          const n = numOf(v)
          root.classList.toggle('none', n === null || n <= 0)
          const tx2 = n === null || n <= 0 ? '' : format(w.ch, n, 0).text
          val.textContent = tx2
          val.setAttribute('font-size', tx2.length > 2 ? '34' : '44')
        }
        const o = f.overLimit === true
        if (o !== over) root.classList.toggle('over', (over = o))
      }
    }
  }
}

// ---------------------------------------------------------------- attitude indicator
const attitude: WidgetDef = {
  type: 'attitude', name: ['Artificial horizon', 'Horizonte artificial'], w: 10, h: 8, props: [],
  make() {
    const root = el('div', 'panel w-attitude')
    const s = svg('svg', { viewBox: '-100 -70 200 140', preserveAspectRatio: 'xMidYMid slice' })
    const world = svg('g', {}, s)
    const K = 3 // svg units per degree of pitch
    svg('rect', { x: -400, y: -600, width: 800, height: 600, fill: '#1d6fb8' }, world)
    svg('rect', { x: -400, y: 0, width: 800, height: 600, fill: '#7a4a1e' }, world)
    svg('line', { x1: -400, y1: 0, x2: 400, y2: 0, stroke: '#fff', 'stroke-width': 1 }, world)
    for (let d = -60; d <= 60; d += 5) {
      if (d === 0) continue
      const major = d % 10 === 0
      const half = major ? 22 : 11
      svg('line', { x1: -half, y1: -d * K, x2: half, y2: -d * K, stroke: '#fff', 'stroke-width': 0.8 }, world)
      if (major)
        for (const side of [-1, 1]) {
          const tEl = svg('text', { x: side * (half + 9), y: -d * K + 3, fill: '#fff', 'font-size': 8, 'text-anchor': 'middle' }, world)
          tEl.textContent = String(Math.abs(d))
        }
    }
    svg('path', { d: 'M-62 0h34l8 9M62 0H28l-8 9', fill: 'none', stroke: '#facc15', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s)
    svg('rect', { x: -2.5, y: -2.5, width: 5, height: 5, fill: '#facc15' }, s)
    root.appendChild(s)
    let lp = 999
    let lb = 999
    return {
      el: root,
      update(f) {
        const p = Math.round(clamp(numOf(f.pitch) || 0, -80, 80) * 5) / 5
        const b = Math.round((numOf(f.bank) || 0) * 5) / 5
        if (p === lp && b === lb) return
        lp = p
        lb = b
        world.setAttribute('transform', `rotate(${-b}) translate(0 ${p * K})`)
      }
    }
  }
}

// ---------------------------------------------------------------- heading tape
const CARDINAL: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }

const compass: WidgetDef = {
  type: 'compass', name: ['Heading tape', 'Fita de proa'], w: 12, h: 2, ch: 'num', defCh: 'heading',
  props: [{ key: 'span', type: 'number', label: ['Degrees visible', 'Graus visíveis'] }],
  make(w) {
    const root = el('div', 'panel w-compass')
    const strip = el('div', 'strip')
    const START = -90
    const END = 450
    const ticks: [HTMLElement, number][] = []
    for (let d = START; d <= END; d += 5) {
      const real = ((d % 360) + 360) % 360
      const tEl = el('i', d % 10 === 0 ? 'maj' : '')
      if (real % 30 === 0) tEl.appendChild(el('b', '', CARDINAL[real] || String(real / 10)))
      strip.appendChild(tEl)
      ticks.push([tEl, d])
    }
    const bug = el('u', 'bug')
    strip.appendChild(bug)
    root.appendChild(strip)
    root.appendChild(el('div', 'mark'))
    const span = clamp(num(w, 'span', 100), 30, 180)
    let ppd = 1
    let width = 0
    let lastH = -1
    let lastBug = -999
    return {
      el: root,
      size(ww, hh) {
        width = ww
        ppd = ww / span
        for (const [tEl, d] of ticks) tEl.style.left = `${(d - START) * ppd}px`
        root.style.fontSize = `${clamp(hh * 0.4, 9, 26)}px`
        lastH = -1
        lastBug = -999
      },
      update(f) {
        const hdg = numOf(w.ch ? f[w.ch] : null) || 0
        const r = Math.round(hdg * 4) / 4
        if (r !== lastH) {
          lastH = r
          strip.style.transform = `translate3d(${(width / 2 - (r - START) * ppd).toFixed(1)}px,0,0)`
        }
        const sel = numOf(f.apHdgSel)
        const at = sel === null ? -999 : r + ((((sel - r) % 360) + 540) % 360) - 180
        if (at !== lastBug) {
          lastBug = at
          bug.style.display = sel === null ? 'none' : ''
          bug.style.left = `${(at - START) * ppd}px`
        }
      }
    }
  }
}

// ---------------------------------------------------------------- moving map
const TILE = 256

const map: WidgetDef = {
  type: 'map', name: ['Moving map', 'Mapa móvel'], w: 12, h: 10,
  props: [{ key: 'zoom', type: 'number', label: ['Zoom (3-16)', 'Zoom (3-16)'] }, { key: 'light', type: 'bool', label: ['Light map', 'Mapa claro'] }],
  make(w, ctx) {
    const root = el('div', `panel w-map${flag(w, 'light') ? '' : ' dark'}`)
    const pane = el('div', 'pane')
    const ship = el('div', 'ship')
    ship.innerHTML = icon('plane')
    root.appendChild(pane)
    root.appendChild(ship)
    root.appendChild(el('div', 'credit', '© OpenStreetMap'))
    const zoomBox = el('div', 'zoom')
    let z = clamp(Math.round(num(w, 'zoom', 11)), 3, 16)
    const tiles: Record<string, HTMLImageElement> = {}
    let bw = 0
    let bh = 0
    let last = ''
    let lat = NaN
    let lon = NaN
    const draw = (force = false) => {
      if (!bw || isNaN(lat)) return
      const n = Math.pow(2, z)
      const fx = ((lon + 180) / 360) * n
      const rad = (clamp(lat, -85, 85) * Math.PI) / 180
      const fy = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n
      const key = `${z}/${Math.floor(fx)}/${Math.floor(fy)}`
      if (key !== last || force) {
        last = key
        const rx = Math.ceil(bw / 2 / TILE) + 1
        const ry = Math.ceil(bh / 2 / TILE) + 1
        const keep: Record<string, boolean> = {}
        for (let x = Math.floor(fx) - rx; x <= Math.floor(fx) + rx; x++)
          for (let y = Math.floor(fy) - ry; y <= Math.floor(fy) + ry; y++) {
            if (y < 0 || y >= n) continue
            const id = `${z}/${((x % n) + n) % n}/${y}@${x}`
            keep[id] = true
            if (tiles[id]) continue
            const img = new Image()
            img.referrerPolicy = 'origin'
            img.draggable = false
            img.style.left = `${x * TILE}px`
            img.style.top = `${y * TILE}px`
            img.src = `https://tile.openstreetmap.org/${z}/${((x % n) + n) % n}/${y}.png`
            pane.appendChild(img)
            tiles[id] = img
          }
        for (const id in tiles)
          if (!keep[id]) {
            pane.removeChild(tiles[id])
            delete tiles[id]
          }
      }
      pane.style.transform = `translate3d(${(bw / 2 - fx * TILE).toFixed(1)}px,${(bh / 2 - fy * TILE).toFixed(1)}px,0)`
    }
    for (const step of [1, -1]) {
      const b = el('button', '', step > 0 ? '+' : '−')
      b.onclick = (e) => {
        e.stopPropagation()
        if (ctx.edit) return
        z = clamp(z + step, 3, 16)
        draw(true)
      }
      zoomBox.appendChild(b)
    }
    root.appendChild(zoomBox)
    let lastHdg = -1
    return {
      el: root,
      size(ww, hh) {
        bw = ww
        bh = hh
        ship.style.width = ship.style.height = `${clamp(Math.min(ww, hh) * 0.14, 22, 54)}px`
        draw(true)
      },
      update(f) {
        const la = numOf(f.lat)
        const lo = numOf(f.lon)
        if (la !== null && lo !== null && (la !== lat || lo !== lon)) {
          lat = la
          lon = lo
          draw()
        }
        const h = Math.round(numOf(f.heading) || 0)
        if (h !== lastHdg) ship.style.transform = `translate(-50%,-50%) rotate(${(lastHdg = h)}deg)`
      }
    }
  }
}

// ---------------------------------------------------------------- button
const button: WidgetDef = {
  type: 'button', name: ['Button', 'Botão'], w: 4, h: 3, ch: 'bool',
  props: [
    P_LABEL, { key: 'icon', type: 'select', label: ['Icon', 'Ícone'], options: [''].concat(Object.keys(ICONS)) }, P_COLOR,
    { key: 'app', type: 'select', label: ['Sends to', 'Envia para'], options: ['msfs', 'freedock', 'ambibox', 'iampcgamer'] },
    { key: 'action', type: 'select', label: ['Action', 'Ação'], options: ['event', 'page', 'notify', 'flash', 'fx', 'capture', 'overlay', 'tip'] },
    { key: 'arg', type: 'text', label: ['Parameter', 'Parâmetro'] }
  ],
  make(w, ctx) {
    const root = el('button', 'panel w-button')
    root.style.setProperty('--on', str(w, 'color') || 'var(--accent)')
    const ic = str(w, 'icon')
    if (ic) root.innerHTML = icon(ic)
    const label = tx(str(w, 'label'))
    const lbl = label ? el('span', '', label) : null
    if (lbl) root.appendChild(lbl)
    let timer = 0
    root.addEventListener('click', (e) => {
      e.stopPropagation()
      if (ctx.edit) return
      ctx.act(str(w, 'app'), str(w, 'action'), str(w, 'arg'))
      root.classList.add('hit')
      clearTimeout(timer)
      timer = window.setTimeout(() => root.classList.remove('hit'), 160)
    })
    let on = false
    return {
      el: root,
      size(ww, hh) {
        const s = Math.min(ww, hh)
        if (ic) (root.firstChild as SVGElement).style.width = `${Math.floor(s * (lbl ? 0.4 : 0.6))}px`
        if (lbl) lbl.style.fontSize = `${fit(label.length, ww * 0.84, hh * (ic ? 0.24 : 0.42), 0.62)}px`
      },
      update(f) {
        const lit = !!w.ch && f[w.ch] === true
        if (lit !== on) root.classList.toggle('on', (on = lit))
      }
    }
  }
}

export const WIDGETS: WidgetDef[] = [value, gear, rpm, bar, gauge, lamp, text, clock, tyres, limit, attitude, compass, map, button]
export const WIDGET: Record<string, WidgetDef> = {}
for (const d of WIDGETS) WIDGET[d.type] = d

/** Channels a widget of this kind can show. */
export const channelsFor = (kind: WidgetDef['ch']) => Object.keys(CHANNEL).filter((id) => kind === 'any' || CHANNEL[id].kind === kind)
