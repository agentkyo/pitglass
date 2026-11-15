// Shared by every view: language, units, and the connection to the PitGlass server.
import { CHANNEL, type Frame, type Value } from '../../src/shared/channels.ts'
import type { Layout, ServerMsg, State, Widget } from '../../src/shared/types.ts'

// ---------------------------------------------------------------- language
const D: Record<string, [string, string]> = {
  waiting: ['Waiting for a game…', 'Aguardando um jogo…'],
  reconnecting: ['Reconnecting to the PC…', 'Reconectando ao PC…'],
  nokey: ['This screen is not paired. Scan the QR code shown by PitGlass on the PC.', 'Esta tela não está pareada. Leia o QR code que o PitGlass mostra no PC.'],
  track: ['Track', 'Pista'],
  fuel: ['Fuel', 'Combustível'],
  destination: ['Destination', 'Destino'],
  origin: ['Origin', 'Origem'],
  cargo: ['Cargo', 'Carga'],
  trailer: ['Trailer', 'Carreta'],
  vehicle: ['Vehicle', 'Veículo'],
  wind: ['Wind', 'Vento'],
  // dash menu
  fullscreen: ['Full screen', 'Tela cheia'],
  auto: ['Automatic (by game)', 'Automático (pelo jogo)'],
  layout: ['Layout', 'Layout'],
  panel: ['Control panel', 'Painel de controle'],
  close: ['Close', 'Fechar'],
  // home
  tagline: ['Your sim dashboard on any screen', 'O painel do seu simulador em qualquer tela'],
  phone: ['Open on your phone', 'Abra no celular'],
  phoneHelp: [
    'Phone and PC on the same Wi-Fi/network: point the camera at the code, or type the address in the browser. The address carries this PC\'s pairing key: do not share it.',
    'Celular e PC na mesma rede/Wi-Fi: aponte a câmera para o código ou digite o endereço no navegador. O endereço leva a chave de pareamento deste PC: não compartilhe.'
  ],
  firewall: [
    'If the phone cannot connect, Windows Firewall is blocking it: run scripts\\allow-lan.cmd once (as administrator).',
    'Se o celular não conectar, o Firewall do Windows está bloqueando: rode scripts\\allow-lan.cmd uma vez (como administrador).'
  ],
  openHere: ['Open dashboard here', 'Abrir o painel aqui'],
  screens: ['screens connected', 'telas conectadas'],
  games: ['Games', 'Jogos'],
  gameNow: ['Now', 'Agora'],
  noGame: ['no game running', 'nenhum jogo aberto'],
  s_on: ['live', 'ao vivo'],
  s_off: ['waiting', 'aguardando'],
  s_blocked: ['port in use by another app', 'porta em uso por outro app'],
  blockedHelp: [
    'Another app (FreeDock, SimHub…) already listens on this game\'s UDP port. Close it, or see docs/INTEGRATIONS.md to share the feed.',
    'Outro app (FreeDock, SimHub…) já escuta a porta UDP deste jogo. Feche-o, ou veja docs/INTEGRATIONS.md para compartilhar o sinal.'
  ],
  needDll: ['SimConnect.dll not found', 'SimConnect.dll não encontrado'],
  layoutFor: ['Layout', 'Layout'],
  default: ['Default', 'Padrão'],
  layouts: ['Layouts', 'Layouts'],
  builtin: ['built-in', 'de fábrica'],
  edit: ['Edit', 'Editar'],
  duplicate: ['Duplicate', 'Duplicar'],
  remove: ['Delete', 'Excluir'],
  export: ['Export', 'Exportar'],
  import: ['Import layout…', 'Importar layout…'],
  newLayout: ['New layout', 'Novo layout'],
  confirmDelete: ['Delete this layout?', 'Excluir este layout?'],
  importBad: ['This file is not a PitGlass layout.', 'Este arquivo não é um layout do PitGlass.'],
  apps: ['Your other apps', 'Seus outros apps'],
  online: ['connected', 'conectado'],
  offline: ['not running', 'fechado'],
  testFlash: ['Test flash', 'Testar flash'],
  bestLapFlash: ['Flash the LED strip on a new best lap', 'Piscar a fita LED em nova melhor volta'],
  capture: ['Screenshot', 'Capturar tela'],
  settings: ['Settings', 'Configurações'],
  language: ['Language', 'Idioma'],
  units: ['Units', 'Unidades'],
  metric: ['Metric (km/h, °C, L)', 'Métrico (km/h, °C, L)'],
  imperial: ['Imperial (mph, °F, gal)', 'Imperial (mph, °F, gal)'],
  demo: ['Demo telemetry', 'Telemetria de demonstração'],
  demoHelp: ['Fake data to try layouts without opening a game.', 'Dados falsos para testar layouts sem abrir um jogo.'],
  d_off: ['Off', 'Desligada'],
  d_car: ['Race car', 'Carro de corrida'],
  d_truck: ['Truck', 'Caminhão'],
  d_plane: ['Aircraft', 'Avião'],
  // editor
  back: ['Back', 'Voltar'],
  save: ['Save', 'Salvar'],
  saved: ['Saved', 'Salvo'],
  unsaved: ['Unsaved changes', 'Alterações não salvas'],
  leave: ['Discard the unsaved changes?', 'Descartar as alterações não salvas?'],
  readonly: ['Built-in layouts are read-only. Duplicate it to make your own.', 'Layouts de fábrica são somente leitura. Duplique para criar o seu.'],
  addWidget: ['Add widget', 'Adicionar widget'],
  pages: ['Pages', 'Páginas'],
  addPage: ['+ page', '+ página'],
  delPage: ['Delete page', 'Excluir página'],
  pageName: ['Page name', 'Nome da página'],
  name: ['Name', 'Nome'],
  kind: ['Made for', 'Feito para'],
  k_car: ['Cars', 'Carros'],
  k_truck: ['Trucks & buses', 'Caminhões e ônibus'],
  k_plane: ['Aircraft', 'Aviões'],
  k_any: ['Any game', 'Qualquer jogo'],
  grid: ['Grid (columns × rows)', 'Grade (colunas × linhas)'],
  colors: ['Colors', 'Cores'],
  c_bg: ['Background', 'Fundo'],
  c_panel: ['Panels', 'Painéis'],
  c_text: ['Text', 'Texto'],
  c_dim: ['Labels', 'Rótulos'],
  c_accent: ['Accent', 'Destaque'],
  font: ['Typeface', 'Fonte'],
  f_sans: ['Standard', 'Padrão'],
  f_condensed: ['Condensed', 'Condensada'],
  f_mono: ['Monospaced', 'Monoespaçada'],
  f_serif: ['Serif (vintage)', 'Serifada (antiga)'],
  pstyle: ['Panel style', 'Estilo dos painéis'],
  s_flat: ['Filled', 'Preenchido'],
  s_outline: ['Framed', 'Com moldura'],
  s_bezel: ['Instruments (chrome ring)', 'Instrumentos (aro cromado)'],
  s_bare: ['No panels', 'Sem painéis'],
  mine: ['My layouts', 'Meus layouts'],
  widget: ['Widget', 'Widget'],
  noSel: ['Click a widget to edit it. Drag to move, pull the corner to resize.', 'Clique num widget para editar. Arraste para mover, puxe o canto para redimensionar.'],
  channel: ['Shows', 'Mostra'],
  none: ['(none)', '(nenhum)'],
  delWidget: ['Delete widget', 'Excluir widget'],
  dupWidget: ['Duplicate', 'Duplicar'],
  layoutProps: ['Layout', 'Layout'],
  preview: ['Preview data', 'Dados da prévia'],
  live: ['Live game', 'Jogo ao vivo'],
  copy: ['copy', 'cópia']
}

export let lang: 'en' | 'pt' = 'en'
export let units: 'metric' | 'imperial' = 'metric'

export function setPrefs(l: string, u: string) {
  let pick = l
  try {
    pick = pick || localStorage.getItem('pg.lang') || ''
  } catch {
    /* storage blocked */
  }
  lang = (pick || navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en'
  units = u === 'imperial' ? 'imperial' : 'metric'
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en'
}

export const t = (k: string): string => (D[k] ? D[k][lang === 'pt' ? 1 : 0] : k)
/** Layout strings starting with @ are translated ("@fuel"). */
export const tx = (s: string): string => (s.charAt(0) === '@' ? t(s.slice(1)) : s)
export const pick = (pair: [string, string] | { en: string; pt: string }): string => (Array.isArray(pair) ? pair[lang === 'pt' ? 1 : 0] : pair[lang])

// ---------------------------------------------------------------- formatting
const IMPERIAL: Record<string, [string, (v: number) => number]> = {
  'km/h': ['mph', (v) => v * 0.621371],
  km: ['mi', (v) => v * 0.621371],
  L: ['gal', (v) => v * 0.264172],
  '°C': ['°F', (v) => v * 1.8 + 32],
  bar: ['psi', (v) => v * 14.5038]
}

/** Display unit of a channel and the conversion from its canonical unit. */
export function unitOf(ch: string | undefined): [string, (v: number) => number] {
  const c = ch ? CHANNEL[ch] : null
  if (c && c.pct) return ['%', (v) => v * 100]
  const unit = c && c.unit ? c.unit : ''
  return units === 'imperial' && IMPERIAL[unit] ? IMPERIAL[unit] : [unit, (v) => v]
}

export function channelLabel(w: Widget): string {
  const own = w.p && w.p.label
  if (typeof own === 'string' && own) return tx(own)
  const c = w.ch ? CHANNEL[w.ch] : null
  return c ? pick(c) : ''
}

/** A channel value as text plus its unit, in the user's unit system. */
export function format(ch: string | undefined, v: Value | undefined, dec?: number): { text: string; unit: string } {
  const c = ch ? CHANNEL[ch] : null
  if (v === null || v === undefined || v === '') return { text: '–', unit: c && !c.pct && c.unit ? c.unit : '' }
  if (typeof v === 'boolean') return { text: v ? 'ON' : 'OFF', unit: '' }
  if (typeof v === 'string') return { text: v, unit: '' }
  let unit = c && c.unit ? c.unit : ''
  let n = v
  if (c && c.pct) {
    n = v * 100
    unit = '%'
  } else if (units === 'imperial' && IMPERIAL[unit]) {
    n = IMPERIAL[unit][1](v)
    unit = IMPERIAL[unit][0]
  }
  const d = dec !== undefined ? dec : c && c.dec !== undefined ? c.dec : 0
  return { text: n.toFixed(d), unit }
}

/** Scale limits for bars and gauges: widget props, then the live maximum, then the channel default. */
export function range(w: Widget, f: Frame): [number, number] {
  const c = w.ch ? CHANNEL[w.ch] : null
  const p = w.p || {}
  const min = typeof p.min === 'number' ? p.min : c && c.min !== undefined ? c.min : 0
  let max = typeof p.max === 'number' ? p.max : NaN
  if (isNaN(max) && c && c.maxFrom && typeof f[c.maxFrom] === 'number' && (f[c.maxFrom] as number) > 0) max = f[c.maxFrom] as number
  if (isNaN(max)) max = c && c.max !== undefined ? c.max : 1
  return [min, max > min ? max : min + 1]
}

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

// ---------------------------------------------------------------- connection
type Listener = () => void

class Net {
  key = ''
  state: State | null = null
  frame: Frame = {}
  game: string | null = null
  layouts: Layout[] = []
  online = false
  /** the server refused us: no pairing key, or a wrong one */
  denied = false
  /** bumped on every telemetry change, so views can skip redraws */
  rev = 0
  private ws: WebSocket | null = null
  private subs: Record<string, Listener[]> = {}
  private retry = 500

  on(ev: 'frame' | 'state' | 'layouts' | 'conn', fn: Listener): () => void {
    ;(this.subs[ev] = this.subs[ev] || []).push(fn)
    return () => {
      this.subs[ev] = this.subs[ev].filter((x) => x !== fn)
    }
  }

  private emit(ev: string) {
    for (const fn of (this.subs[ev] || []).slice()) fn()
  }

  async api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    if (this.key) headers['x-pitglass-key'] = this.key
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await r.json().catch(() => null)
    if (r.status === 403) {
      this.denied = true
      this.emit('conn')
    }
    if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`)
    return data as T
  }

  async loadLayouts() {
    this.layouts = await this.api<Layout[]>('GET', '/api/layouts')
    this.emit('layouts')
  }

  async start() {
    // the pairing key arrives in the address (?k=...) once, then lives in this browser's storage
    const url = new URL(location.href)
    const k = url.searchParams.get('k')
    try {
      if (k) localStorage.setItem('pg.key', k)
      this.key = k || localStorage.getItem('pg.key') || ''
    } catch {
      this.key = k || ''
    }
    if (k) {
      url.searchParams.delete('k')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    try {
      this.state = await this.api<State>('GET', '/api/state')
      await this.loadLayouts()
    } catch {
      /* the socket loop below keeps trying */
    }
    this.connect()
  }

  private connect() {
    const ws = new WebSocket(`ws://${location.host}/ws${this.key ? `?k=${encodeURIComponent(this.key)}` : ''}`)
    this.ws = ws
    ws.onopen = () => {
      this.online = true
      this.denied = false
      this.retry = 500
      this.emit('conn')
      if (!this.layouts.length) void this.loadLayouts().catch(() => {})
    }
    ws.onmessage = (ev) => {
      let m: ServerMsg
      try {
        m = JSON.parse(ev.data)
      } catch {
        return
      }
      if (m.t === 'diff') {
        const d = m.d
        for (const key in d) this.frame[key] = d[key]
        this.rev++
        this.emit('frame')
      } else if (m.t === 'full') {
        this.frame = m.d
        this.game = m.game
        this.rev++
        this.emit('frame')
      } else if (m.t === 'state') {
        this.state = m.state
        this.emit('state')
      } else if (m.t === 'layouts') void this.loadLayouts().catch(() => {})
    }
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.online = false
      this.emit('conn')
      setTimeout(() => this.connect(), this.retry)
      this.retry = Math.min(4000, this.retry * 2)
    }
    ws.onerror = () => ws.close()
  }
}

export const net = new Net()
