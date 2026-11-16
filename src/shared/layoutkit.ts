// Building blocks for the built-in layouts: the widget shorthand, themes and the pages several layouts share.
import type { Page, Theme, Widget } from './types.ts'

let seq = 0
export const w = (type: string, x: number, y: number, ww: number, h: number, ch?: string, p: Widget['p'] = {}): Widget => ({ id: `b${++seq}`, type, x, y, w: ww, h, ch, p })
export const theme = (accent: string, bg = '#05070a', panel = '#0f141b'): Theme => ({ bg, panel, text: '#f1f5f9', dim: '#7c8a9c', accent })
/** theme with everything spelled out: colors, typeface, panel style */
export const look = (t: Partial<Theme> & { accent: string }): Theme => ({ bg: '#05070a', panel: '#0f141b', text: '#f1f5f9', dim: '#7c8a9c', ...t })
export const base = { pitglass: 1 as const, cols: 24, rows: 12, author: 'PitGlass', builtin: true }

export const RED = '#ef4444'
export const AMBER = '#f59e0b'
export const GREEN = '#22c55e'
export const BLUE = '#3b82f6'
export const PURPLE = '#a855f7'

/** The row of warning lights across the top of a truck dashboard. */
export const truckLamps = (): Widget[] => [
  w('lamp', 0, 0, 3, 2, 'blinkL', { icon: 'left', color: GREEN }),
  w('lamp', 3, 0, 2, 2, 'lowBeam', { icon: 'low', color: GREEN }),
  w('lamp', 5, 0, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
  w('lamp', 7, 0, 2, 2, 'beacon', { icon: 'beacon', color: AMBER }),
  w('lamp', 9, 0, 2, 2, 'wipers', { icon: 'wiper', color: '#94a3b8' }),
  w('lamp', 11, 0, 2, 2, 'handbrake', { icon: 'park', color: RED }),
  w('lamp', 13, 0, 2, 2, 'engineBrake', { label: 'EB', color: AMBER }),
  w('lamp', 15, 0, 2, 2, 'cruiseOn', { icon: 'cruise', color: GREEN }),
  w('lamp', 17, 0, 2, 2, 'airWarn', { label: 'AIR', color: RED }),
  w('lamp', 19, 0, 2, 2, 'fuelWarn', { icon: 'fuel', color: AMBER }),
  w('lamp', 21, 0, 3, 2, 'blinkR', { icon: 'right', color: GREEN })
]

/** Warning lights of a coach: the engine and air warnings a bus driver watches, instead of the trailer-era ones. */
export const coachLamps = (): Widget[] => [
  w('lamp', 0, 0, 3, 2, 'blinkL', { icon: 'left', color: GREEN }),
  w('lamp', 3, 0, 2, 2, 'lowBeam', { icon: 'low', color: GREEN }),
  w('lamp', 5, 0, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
  w('lamp', 7, 0, 2, 2, 'handbrake', { icon: 'park', color: RED }),
  w('lamp', 9, 0, 2, 2, 'cruiseOn', { icon: 'cruise', color: GREEN }),
  w('lamp', 11, 0, 2, 2, 'engineBrake', { label: 'RET', color: AMBER }),
  w('lamp', 13, 0, 2, 2, 'airWarn', { label: 'AIR', color: RED }),
  w('lamp', 15, 0, 2, 2, 'oilWarn', { label: 'OIL', color: RED }),
  w('lamp', 17, 0, 2, 2, 'waterWarn', { label: 'TEMP', color: RED }),
  w('lamp', 19, 0, 2, 2, 'fuelWarn', { icon: 'fuel', color: AMBER }),
  w('lamp', 21, 0, 3, 2, 'blinkR', { icon: 'right', color: GREEN })
]

/** A coach run: where to, the terminal, time and distance left, and what just happened (toll, fine, arrival). */
export const tripPage = (): Page => ({
  name: 'Trip',
  widgets: [
    w('text', 0, 0, 8, 3, 'origin', { label: '@origin' }),
    w('text', 8, 0, 8, 3, 'destination', { label: '@destination' }),
    w('text', 16, 0, 8, 3, 'destCompany', { label: 'TERMINAL' }),
    w('value', 0, 3, 6, 3, 'navDistance', { label: 'ROUTE' }),
    w('value', 6, 3, 6, 3, 'navTime', { label: 'ETA' }),
    w('value', 12, 3, 6, 3, 'deadline'),
    w('value', 18, 3, 6, 3, 'restStop'),
    w('text', 0, 6, 16, 3, 'notice', { label: 'LAST EVENT' }),
    w('value', 16, 6, 8, 3, 'income'),
    w('value', 0, 9, 6, 3, 'fuel'),
    w('value', 6, 9, 6, 3, 'fuelAvg', { label: 'AVG' }),
    w('value', 12, 9, 6, 3, 'odometer'),
    w('value', 18, 9, 6, 3, 'gameClock')
  ]
})

/** Pages shared by more than one layout. */
export const autopilotPage = (): Page => ({
  name: 'Autopilot',
  widgets: [
    w('button', 0, 0, 4, 3, 'apMaster', { label: 'AP', app: 'msfs', action: 'event', arg: 'AP_MASTER' }),
    w('button', 4, 0, 4, 3, 'apHdg', { label: 'HDG', app: 'msfs', action: 'event', arg: 'AP_PANEL_HEADING_HOLD' }),
    w('button', 8, 0, 4, 3, 'apNav', { label: 'NAV', app: 'msfs', action: 'event', arg: 'AP_NAV1_HOLD' }),
    w('button', 12, 0, 4, 3, 'apApr', { label: 'APR', app: 'msfs', action: 'event', arg: 'AP_APR_HOLD' }),
    w('button', 16, 0, 4, 3, 'apAlt', { label: 'ALT', app: 'msfs', action: 'event', arg: 'AP_PANEL_ALTITUDE_HOLD' }),
    w('button', 20, 0, 4, 3, 'apVs', { label: 'VS', app: 'msfs', action: 'event', arg: 'AP_PANEL_VS_HOLD' }),
    w('button', 0, 3, 2, 3, undefined, { label: '−', app: 'msfs', action: 'event', arg: 'HEADING_BUG_DEC' }),
    w('value', 2, 3, 4, 3, 'apHdgSel', { label: 'HDG' }),
    w('button', 6, 3, 2, 3, undefined, { label: '+', app: 'msfs', action: 'event', arg: 'HEADING_BUG_INC' }),
    w('button', 8, 3, 2, 3, undefined, { label: '−', app: 'msfs', action: 'event', arg: 'AP_ALT_VAR_DEC' }),
    w('value', 10, 3, 4, 3, 'apAltSel', { label: 'ALT' }),
    w('button', 14, 3, 2, 3, undefined, { label: '+', app: 'msfs', action: 'event', arg: 'AP_ALT_VAR_INC' }),
    w('button', 16, 3, 2, 3, undefined, { label: '−', app: 'msfs', action: 'event', arg: 'AP_VS_VAR_DEC' }),
    w('value', 18, 3, 4, 3, 'apVsSel', { label: 'VS' }),
    w('button', 22, 3, 2, 3, undefined, { label: '+', app: 'msfs', action: 'event', arg: 'AP_VS_VAR_INC' }),
    w('button', 0, 6, 4, 3, 'gearDown', { label: 'GEAR', app: 'msfs', action: 'event', arg: 'GEAR_TOGGLE' }),
    w('button', 4, 6, 4, 3, undefined, { label: 'FLAPS −', app: 'msfs', action: 'event', arg: 'FLAPS_DECR' }),
    w('value', 8, 6, 4, 3, 'flaps'),
    w('button', 12, 6, 4, 3, undefined, { label: 'FLAPS +', app: 'msfs', action: 'event', arg: 'FLAPS_INCR' }),
    w('button', 16, 6, 4, 3, 'handbrake', { label: 'PARK', app: 'msfs', action: 'event', arg: 'PARKING_BRAKES', color: RED }),
    w('value', 20, 6, 4, 3, 'baro', { label: 'BARO' }),
    w('button', 0, 9, 5, 3, 'lightLanding', { label: 'LAND', app: 'msfs', action: 'event', arg: 'LANDING_LIGHTS_TOGGLE', color: AMBER }),
    w('button', 5, 9, 5, 3, 'lightTaxi', { label: 'TAXI', app: 'msfs', action: 'event', arg: 'TOGGLE_TAXI_LIGHTS', color: AMBER }),
    w('button', 10, 9, 5, 3, 'lightNav', { label: 'NAV LT', app: 'msfs', action: 'event', arg: 'TOGGLE_NAV_LIGHTS', color: AMBER }),
    w('button', 15, 9, 5, 3, 'lightStrobe', { label: 'STROBE', app: 'msfs', action: 'event', arg: 'STROBES_TOGGLE', color: AMBER }),
    w('button', 20, 9, 4, 3, 'beacon', { label: 'BCN', app: 'msfs', action: 'event', arg: 'TOGGLE_BEACON_LIGHTS', color: AMBER })
  ]
})

/** The truck on the real map, turning with the road, with the route numbers beside it. */
export const gpsWidgets = (): Widget[] => [
  w('map', 0, 0, 17, 12, undefined, { zoom: 9, rotate: true, icon: 'arrow' }),
  w('limit', 17, 0, 3, 3, 'speedLimit'),
  w('value', 20, 0, 4, 3, 'speed', { warn: 'overLimit' }),
  w('value', 17, 3, 7, 2, 'navDistance'),
  w('value', 17, 5, 7, 2, 'navTime'),
  w('text', 17, 7, 7, 2, 'destination', { label: '@destination' }),
  w('value', 17, 9, 4, 3, 'restStop'),
  w('value', 21, 9, 3, 3, 'gameClock')
]

export const jobPage = (): Page => ({
  name: 'Job',
  widgets: [
    w('text', 0, 0, 12, 3, 'cargo', { label: '@cargo' }),
    w('text', 12, 0, 6, 3, 'origin', { label: '@origin' }),
    w('text', 18, 0, 6, 3, 'destination', { label: '@destination' }),
    w('value', 0, 3, 6, 3, 'jobDistance'),
    w('value', 6, 3, 6, 3, 'deadline'),
    w('value', 12, 3, 6, 3, 'income'),
    w('value', 18, 3, 6, 3, 'restStop'),
    w('value', 0, 6, 6, 3, 'truckDamage', { warnAbove: 0.1 }),
    w('value', 6, 6, 6, 3, 'cargoDamage', { warnAbove: 0.05 }),
    w('value', 12, 6, 6, 3, 'waterTemp'),
    w('value', 18, 6, 6, 3, 'oilTemp'),
    w('value', 0, 9, 6, 3, 'adblue'),
    w('lamp', 6, 9, 6, 3, 'trailer', { label: '@trailer', color: GREEN }),
    w('text', 12, 9, 7, 3, 'vehicle', { label: '@vehicle' }),
    w('clock', 19, 9, 5, 3)
  ]
})

