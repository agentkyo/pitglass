// Settings and user layouts on disk: %APPDATA%\PitGlass (or ~/.config/pitglass).
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { BUILTIN } from '../shared/layouts.ts'
import { DEFAULT_CONFIG, type Config, type Layout } from '../shared/types.ts'

export const dataDir = () =>
  process.env.PITGLASS_HOME ??
  (process.platform === 'win32'
    ? path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'PitGlass')
    : path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config'), 'pitglass'))

const ID = /^[a-z0-9][a-z0-9-]{0,47}$/
const COLOR = /^#[0-9a-fA-F]{3,8}$/

/** Checks and normalizes a layout that came from outside (the editor, an imported file). Throws on junk. */
export function cleanLayout(raw: unknown): Layout {
  const l = raw as Layout
  if (!l || typeof l !== 'object') throw new Error('not a layout')
  if (!ID.test(String(l.id))) throw new Error('bad id')
  const int = (v: unknown, lo: number, hi: number) => {
    const n = Math.round(Number(v))
    if (!(n >= lo && n <= hi)) throw new Error('number out of range')
    return n
  }
  const cols = int(l.cols, 4, 64)
  const rows = int(l.rows, 2, 64)
  if (!Array.isArray(l.pages) || l.pages.length < 1 || l.pages.length > 12) throw new Error('bad pages')
  const color = (v: unknown, d: string) => (COLOR.test(String(v)) ? String(v) : d)
  const t = (l.theme ?? {}) as Layout['theme']
  return {
    pitglass: 1,
    id: l.id,
    name: String(l.name ?? l.id).slice(0, 60),
    author: l.author ? String(l.author).slice(0, 60) : undefined,
    kind: ['car', 'truck', 'plane', 'any'].includes(l.kind) ? l.kind : 'any',
    cols,
    rows,
    theme: { bg: color(t.bg, '#05070a'), panel: color(t.panel, '#10151c'), text: color(t.text, '#f1f5f9'), dim: color(t.dim, '#7c8a9c'), accent: color(t.accent, '#38bdf8') },
    pages: l.pages.map((p) => {
      if (!Array.isArray(p?.widgets) || p.widgets.length > 80) throw new Error('bad widgets')
      return {
        name: String(p.name ?? '').slice(0, 30),
        widgets: p.widgets.map((w, i) => {
          const p2: Record<string, string | number | boolean> = {}
          for (const [k, v] of Object.entries(w.p ?? {}).slice(0, 24))
            if (/^[a-zA-Z]\w{0,23}$/.test(k) && (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string')) p2[k] = typeof v === 'string' ? v.slice(0, 200) : v
          return {
            id: String(w.id ?? `w${i}`).slice(0, 24),
            type: String(w.type).slice(0, 24),
            x: int(w.x, 0, cols - 1),
            y: int(w.y, 0, rows - 1),
            w: int(w.w, 1, cols),
            h: int(w.h, 1, rows),
            ch: w.ch ? String(w.ch).slice(0, 32) : undefined,
            p: p2
          }
        })
      }
    })
  }
}

export class Store {
  config: Config = { ...DEFAULT_CONFIG }
  /** pairing key: screens outside this PC must present it */
  key = ''
  private user = new Map<string, Layout>()

  private dir: string

  constructor(dir = dataDir()) {
    this.dir = dir
    fs.mkdirSync(path.join(dir, 'layouts'), { recursive: true })
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'))
      this.key = typeof raw.key === 'string' ? raw.key : ''
      this.setConfig(raw.config ?? {}, false)
    } catch {
      /* first run */
    }
    if (!/^[A-Za-z0-9_-]{16,}$/.test(this.key)) {
      this.key = crypto.randomBytes(12).toString('base64url')
      this.save()
    }
    for (const f of fs.readdirSync(path.join(dir, 'layouts')))
      if (f.endsWith('.json'))
        try {
          const l = cleanLayout(JSON.parse(fs.readFileSync(path.join(dir, 'layouts', f), 'utf8')))
          if (!BUILTIN.some((b) => b.id === l.id)) this.user.set(l.id, l)
        } catch {
          /* a broken file is skipped, not deleted */
        }
  }

  private save() {
    fs.writeFileSync(path.join(this.dir, 'config.json'), JSON.stringify({ key: this.key, config: this.config }, null, 2))
  }

  setConfig(patch: Partial<Config>, save = true) {
    const c = this.config
    if (patch.lang === 'en' || patch.lang === 'pt' || patch.lang === '') c.lang = patch.lang
    if (patch.units === 'metric' || patch.units === 'imperial') c.units = patch.units
    if (patch.demo && ['off', 'car', 'truck', 'plane'].includes(patch.demo)) c.demo = patch.demo
    if (typeof patch.bestLapFlash === 'boolean') c.bestLapFlash = patch.bestLapFlash
    if (typeof patch.simconnectDll === 'string') c.simconnectDll = patch.simconnectDll.slice(0, 400)
    if (patch.assign && typeof patch.assign === 'object') {
      const a: Record<string, string> = {}
      for (const [g, id] of Object.entries(patch.assign)) if (/^[a-z0-9]{1,16}$/.test(g) && (id === '' || ID.test(String(id)))) a[g] = String(id)
      c.assign = a
    }
    if (save) this.save()
  }

  layouts(): Layout[] {
    return [...BUILTIN, ...this.user.values()]
  }

  put(raw: unknown): Layout {
    const l = cleanLayout(raw)
    if (BUILTIN.some((b) => b.id === l.id)) throw new Error('built-in layouts are read-only: duplicate it first')
    if (!this.user.has(l.id) && this.user.size >= 200) throw new Error('too many layouts')
    this.user.set(l.id, l)
    fs.writeFileSync(path.join(this.dir, 'layouts', `${l.id}.json`), JSON.stringify(l, null, 2))
    return l
  }

  remove(id: string): boolean {
    if (!ID.test(id) || !this.user.delete(id)) return false
    fs.rmSync(path.join(this.dir, 'layouts', `${id}.json`), { force: true })
    return true
  }
}
