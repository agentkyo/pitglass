// Layout format (the JSON people share) and the messages between server and screens.
import type { Frame } from './channels.ts'

export interface Widget {
  id: string
  /** widget type, see web/widgets.ts */
  type: string
  /** position and size in grid cells */
  x: number
  y: number
  w: number
  h: number
  /** channel id, for widgets bound to one value */
  ch?: string
  /** everything else: label, color, icon, min, max... */
  p?: Record<string, string | number | boolean>
}

export interface Page {
  name: string
  widgets: Widget[]
}

export interface Theme {
  bg: string
  panel: string
  text: string
  dim: string
  accent: string
  /** typeface family; default sans */
  font?: ThemeFont
  /** how panels are drawn; default flat */
  style?: ThemeStyle
}

export const FONTS = ['sans', 'condensed', 'mono', 'serif'] as const
export type ThemeFont = (typeof FONTS)[number]
/** flat = filled panels · outline = framed boxes · bezel = round chrome-ringed instruments · bare = no panels */
export const STYLES = ['flat', 'outline', 'bezel', 'bare'] as const
export type ThemeStyle = (typeof STYLES)[number]

export interface Layout {
  /** format version */
  pitglass: 1
  id: string
  name: string
  author?: string
  /** 'car' | 'truck' | 'plane' | 'any': which family of games it was drawn for */
  kind: 'car' | 'truck' | 'plane' | 'any'
  cols: number
  rows: number
  theme: Theme
  pages: Page[]
  /** shipped with the app: read-only, duplicate it to edit */
  builtin?: boolean
}

export interface Config {
  lang: 'en' | 'pt' | ''
  units: 'metric' | 'imperial'
  /** game id -> layout id; '' in a game uses the default for its kind */
  assign: Record<string, string>
  /** off | car | truck | plane: fake telemetry to try layouts without a game */
  demo: 'off' | 'car' | 'truck' | 'plane'
  /** Ambibox LED strip flashes purple on a new best lap */
  bestLapFlash: boolean
  simconnectDll: string
}

export interface SourceStatus {
  id: string
  /** off = game not found · on = sending data · blocked = something else owns the port */
  state: 'off' | 'on' | 'blocked'
  note?: string
}

export interface AppLink {
  id: 'freedock' | 'ambibox' | 'iampcgamer' | 'mywheel'
  name: string
  online: boolean
  version?: string
  detail?: string
  pages?: { id: string; name: string }[]
}

export interface State {
  version: string
  game: string | null
  sources: SourceStatus[]
  apps: AppLink[]
  config: Config
  /** address to open on the phone, with the pairing key; only sent to the PC itself */
  phoneUrl?: string
  qr?: string
  screens: number
}

export type ServerMsg =
  | { t: 'full'; game: string | null; d: Frame }
  | { t: 'diff'; d: Frame }
  | { t: 'state'; state: State }
  | { t: 'layouts' }

export const DEFAULT_CONFIG: Config = { lang: '', units: 'metric', assign: {}, demo: 'off', bestLapFlash: true, simconnectDll: '' }
export const PORT = 47830
/** UDP: MyWheel-style drive state (steer, pedals, gear) from any app, see docs/INTEGRATIONS.md */
export const DRIVE_PORT = 47831
