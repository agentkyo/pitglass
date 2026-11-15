// Microsoft Flight Simulator 2020/2024 through SimConnect.dll, called directly (no SDK install).
// The DLL is not shipped with the sim and cannot be bundled here: PitGlass looks for it in the
// MSFS SDK folders, in the Logitech flight panel plugin (which ships a compatible x64 copy) and in
// the path set in the settings. One FLOAT64 per data definition, delivered when it changes.
import fs from 'node:fs'
import path from 'node:path'
import koffi from 'koffi'
import type { Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'
import { round, type Source } from './source.ts'

const USER_OBJECT = 0
const UNUSED = 0xffffffff
const DATATYPE_FLOAT64 = 4
const PERIOD_SIM_FRAME = 3
const FLAG_CHANGED = 1
const RECV_QUIT = 3
const RECV_SIMOBJECT_DATA = 8

type Conv = (v: number) => number | boolean | string
const bool: Conv = (v) => v !== 0
const int: Conv = (v) => round(v)

/** [SimVar, units, channel, conversion] */
const VARS: [string, string, string, Conv][] = [
  ['INDICATED ALTITUDE', 'feet', 'altitude', int],
  ['AIRSPEED INDICATED', 'knots', 'ias', int],
  ['GROUND VELOCITY', 'knots', 'groundSpeed', int],
  ['VERTICAL SPEED', 'feet per minute', 'vs', (v) => Math.round(v / 10) * 10],
  ['PLANE HEADING DEGREES MAGNETIC', 'degrees', 'heading', (v) => round(v, 1)],
  // SimConnect: pitch is positive nose down and bank positive to the left. Published the pilot's way.
  ['PLANE PITCH DEGREES', 'degrees', 'pitch', (v) => round(-v, 1)],
  ['PLANE BANK DEGREES', 'degrees', 'bank', (v) => round(-v, 1)],
  ['PLANE LATITUDE', 'degrees', 'lat', (v) => round(v, 5)],
  ['PLANE LONGITUDE', 'degrees', 'lon', (v) => round(v, 5)],
  ['FLAPS HANDLE INDEX', 'number', 'flaps', int],
  ['GEAR HANDLE POSITION', 'bool', 'gearDown', bool],
  ['SIM ON GROUND', 'bool', 'onGround', bool],
  ['BRAKE PARKING POSITION', 'bool', 'handbrake', bool],
  ['SPOILERS HANDLE POSITION', 'percent', 'spoilers', (v) => round(v / 100, 2)],
  ['GENERAL ENG THROTTLE LEVER POSITION:1', 'percent', 'throttle', (v) => round(v / 100, 2)],
  ['GENERAL ENG RPM:1', 'rpm', 'rpm', int],
  ['FUEL TOTAL QUANTITY', 'liters', 'fuel', int],
  ['FUEL TOTAL CAPACITY', 'liters', 'fuelMax', int],
  ['KOHLSMAN SETTING HG', 'inHg', 'baro', (v) => round(v, 2)],
  ['COM ACTIVE FREQUENCY:1', 'MHz', 'com1', (v) => round(v, 3)],
  ['AMBIENT WIND DIRECTION', 'degrees', 'windDir', int],
  ['AMBIENT WIND VELOCITY', 'knots', 'windSpeed', int],
  ['GPS WP DISTANCE', 'nautical miles', 'wpDistance', (v) => round(v, 1)],
  ['GPS WP ETE', 'seconds', 'wpEte', (v) => (v > 0 && v < 360000 ? `${Math.floor(v / 3600)}:${String(Math.floor((v % 3600) / 60)).padStart(2, '0')}` : '')],
  ['LIGHT LANDING', 'bool', 'lightLanding', bool],
  ['LIGHT TAXI', 'bool', 'lightTaxi', bool],
  ['LIGHT NAV', 'bool', 'lightNav', bool],
  ['LIGHT STROBE', 'bool', 'lightStrobe', bool],
  ['LIGHT BEACON', 'bool', 'beacon', bool],
  ['AUTOPILOT MASTER', 'bool', 'apMaster', bool],
  ['AUTOPILOT HEADING LOCK', 'bool', 'apHdg', bool],
  ['AUTOPILOT HEADING LOCK DIR', 'degrees', 'apHdgSel', int],
  ['AUTOPILOT ALTITUDE LOCK', 'bool', 'apAlt', bool],
  ['AUTOPILOT ALTITUDE LOCK VAR', 'feet', 'apAltSel', int],
  ['AUTOPILOT VERTICAL HOLD', 'bool', 'apVs', bool],
  ['AUTOPILOT VERTICAL HOLD VAR', 'feet per minute', 'apVsSel', int],
  ['AUTOPILOT NAV1 LOCK', 'bool', 'apNav', bool],
  ['AUTOPILOT APPROACH HOLD', 'bool', 'apApr', bool]
]

/** Sim events a dashboard button may fire (K: events). Nothing outside this list is sent. */
export const MSFS_EVENTS = [
  'AP_MASTER', 'AP_PANEL_HEADING_HOLD', 'AP_PANEL_ALTITUDE_HOLD', 'AP_PANEL_VS_HOLD', 'AP_NAV1_HOLD', 'AP_APR_HOLD',
  'HEADING_BUG_INC', 'HEADING_BUG_DEC', 'AP_ALT_VAR_INC', 'AP_ALT_VAR_DEC', 'AP_VS_VAR_INC', 'AP_VS_VAR_DEC',
  'GEAR_TOGGLE', 'FLAPS_INCR', 'FLAPS_DECR', 'PARKING_BRAKES', 'LANDING_LIGHTS_TOGGLE', 'TOGGLE_TAXI_LIGHTS',
  'TOGGLE_NAV_LIGHTS', 'STROBES_TOGGLE', 'TOGGLE_BEACON_LIGHTS', 'KOHLSMAN_INC', 'KOHLSMAN_DEC', 'BAROMETRIC'
]

export function findSimConnect(override = ''): string | null {
  const pf = process.env.ProgramFiles ?? 'C:\\Program Files'
  const list = [
    override,
    ...['MSFS2024_SDK', 'MSFS_SDK'].map((v) => (process.env[v] ? path.join(process.env[v]!, 'SimConnect SDK', 'lib', 'SimConnect.dll') : '')),
    'C:\\MSFS 2024 SDK\\SimConnect SDK\\lib\\SimConnect.dll',
    'C:\\MSFS SDK\\SimConnect SDK\\lib\\SimConnect.dll',
    path.join(pf, 'Logitech', 'Microsoft Flight Simulator Plugin', 'SimConnect.dll')
  ]
  return list.find((p) => p && fs.existsSync(p)) ?? null
}

interface Dll {
  Open(h: unknown[], name: string, hwnd: null, ev: number, evh: null, cfg: number): number
  Close(h: unknown): number
  AddToDataDefinition(h: unknown, def: number, name: string, units: string, type: number, eps: number, id: number): number
  RequestDataOnSimObject(h: unknown, req: number, def: number, obj: number, period: number, flags: number, origin: number, interval: number, limit: number): number
  MapClientEventToSimEvent(h: unknown, id: number, name: string): number
  TransmitClientEvent(h: unknown, obj: number, id: number, data: number, group: number, flags: number): number
  GetNextDispatch(h: unknown, data: unknown[], size: number[]): number
}

export class MsfsSource implements Source {
  id = 'msfs'
  private dll: Dll | null = null
  private dllTried = ''
  private handle: unknown = null
  private values: Frame = {}
  private nextOpen = 0
  private events = new Map<string, number>()
  dllPath: string | null = null

  private override: () => string

  constructor(override: () => string = () => '') {
    this.override = override
  }

  private load(): boolean {
    if (process.platform !== 'win32') return false
    const p = findSimConnect(this.override())
    if (!p) return false
    if (this.dll && p === this.dllPath) return true
    if (p === this.dllTried) return false
    this.dllTried = p
    try {
      const lib = koffi.load(p)
      this.dll = {
        Open: lib.func('int32_t SimConnect_Open(_Out_ void** h, str name, void* hwnd, uint32_t ev, void* evh, uint32_t cfg)'),
        Close: lib.func('int32_t SimConnect_Close(void* h)'),
        AddToDataDefinition: lib.func('int32_t SimConnect_AddToDataDefinition(void* h, uint32_t def, str name, str units, uint32_t type, float eps, uint32_t id)'),
        RequestDataOnSimObject: lib.func('int32_t SimConnect_RequestDataOnSimObject(void* h, uint32_t req, uint32_t def, uint32_t obj, uint32_t period, uint32_t flags, uint32_t origin, uint32_t interval, uint32_t limit)'),
        MapClientEventToSimEvent: lib.func('int32_t SimConnect_MapClientEventToSimEvent(void* h, uint32_t id, str name)'),
        TransmitClientEvent: lib.func('int32_t SimConnect_TransmitClientEvent(void* h, uint32_t obj, uint32_t id, uint32_t data, uint32_t group, uint32_t flags)'),
        GetNextDispatch: lib.func('int32_t SimConnect_GetNextDispatch(void* h, _Out_ void** data, _Out_ uint32_t* size)')
      } as Dll
      this.dllPath = p
      return true
    } catch {
      this.dll = null
      return false
    }
  }

  private open(now: number) {
    if (now < this.nextOpen) return
    this.nextOpen = now + 3000
    if (!this.load() || !this.dll) return
    const h: unknown[] = [null]
    if (this.dll.Open(h, 'PitGlass', null, 0, null, 0) < 0 || !h[0]) return
    this.handle = h[0]
    this.values = {}
    this.events.clear()
    VARS.forEach(([name, units], i) => {
      this.dll!.AddToDataDefinition(this.handle, i + 1, name, units, DATATYPE_FLOAT64, 0, UNUSED)
      this.dll!.RequestDataOnSimObject(this.handle, i + 1, i + 1, USER_OBJECT, PERIOD_SIM_FRAME, FLAG_CHANGED, 0, 0, 0)
    })
  }

  private close() {
    if (this.handle && this.dll) this.dll.Close(this.handle)
    this.handle = null
    this.values = {}
  }

  poll(now: number): Frame | null {
    if (!this.handle) this.open(now)
    if (!this.handle || !this.dll) return null
    const data: unknown[] = [null]
    const size: number[] = [0]
    for (let i = 0; i < 400 && this.dll.GetNextDispatch(this.handle, data, size) >= 0; i++) {
      if (!data[0] || size[0] < 12) break
      const raw = Buffer.from(koffi.view(data[0], size[0]))
      const id = raw.readUInt32LE(8)
      if (id === RECV_SIMOBJECT_DATA && size[0] >= 48) {
        const v = VARS[raw.readUInt32LE(12) - 1]
        if (v) this.values[v[2]] = v[3](raw.readDoubleLE(40))
      } else if (id === RECV_QUIT) {
        this.close()
        return null
      }
    }
    // connected to the sim but still in the menus: no aircraft data yet
    if (this.values.altitude == null) return null
    return { game: 'msfs', ...this.values }
  }

  /** Fires a K: event from the allow-list. */
  send(event: string, value = 0): boolean {
    event = event.toUpperCase()
    if (!this.handle || !this.dll || !MSFS_EVENTS.includes(event)) return false
    let id = this.events.get(event)
    if (id === undefined) {
      id = 1000 + this.events.size
      if (this.dll.MapClientEventToSimEvent(this.handle, id, event) < 0) return false
      this.events.set(event, id)
    }
    return this.dll.TransmitClientEvent(this.handle, USER_OBJECT, id, value >>> 0, 1, 0x10) >= 0
  }

  status(): SourceStatus {
    if (this.handle) return { id: this.id, state: this.values.altitude != null ? 'on' : 'off' }
    return { id: this.id, state: 'off', note: process.platform === 'win32' && !findSimConnect(this.override()) ? 'SimConnect.dll' : undefined }
  }

  stop() {
    this.close()
  }
}
