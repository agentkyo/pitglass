// Layouts shipped with PitGlass. They are read-only: duplicate one in the editor to change it.
// All use a 24 x 12 grid, drawn for a phone lying sideways (2:1), and stretch to any screen.
import type { Layout, Theme, Widget } from './types.ts'

let seq = 0
const w = (type: string, x: number, y: number, ww: number, h: number, ch?: string, p: Widget['p'] = {}): Widget => ({ id: `b${++seq}`, type, x, y, w: ww, h, ch, p })
const theme = (accent: string, bg = '#05070a', panel = '#0f141b'): Theme => ({ bg, panel, text: '#f1f5f9', dim: '#7c8a9c', accent })
const base = { pitglass: 1 as const, cols: 24, rows: 12, author: 'PitGlass', builtin: true }

const RED = '#ef4444'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#3b82f6'
const PURPLE = '#a855f7'

export const BUILTIN: Layout[] = [
  {
    ...base, id: 'race-gt', name: 'Race GT', kind: 'car', theme: theme('#f43f5e'),
    pages: [
      {
        name: 'Race',
        widgets: [
          w('rpm', 0, 0, 24, 2, 'rpmPct'),
          w('value', 0, 2, 8, 4, 'speed'),
          w('value', 0, 6, 4, 3, 'position', { label: 'POS' }),
          w('value', 4, 6, 4, 3, 'lap'),
          w('value', 0, 9, 4, 3, 'fuel'),
          w('bar', 4, 9, 4, 3, 'fuelPct', { color: AMBER }),
          w('gear', 8, 2, 8, 7, 'gear'),
          w('lamp', 8, 9, 2, 3, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 10, 9, 2, 3, 'abs', { label: 'ABS', color: AMBER }),
          w('lamp', 12, 9, 2, 3, 'pitLimiter', { label: 'PIT', color: BLUE }),
          w('lamp', 14, 9, 2, 3, 'inPit', { label: 'LANE', color: GREEN }),
          w('value', 16, 2, 8, 2, 'lapCurrent'),
          w('value', 16, 4, 8, 2, 'lapLast'),
          w('value', 16, 6, 8, 2, 'lapBest', { color: PURPLE }),
          w('tyres', 16, 8, 8, 4)
        ]
      },
      {
        name: 'Car',
        widgets: [
          w('rpm', 0, 0, 24, 1, 'rpmPct'),
          w('tyres', 0, 1, 10, 8),
          w('bar', 10, 1, 2, 8, 'throttle', { dir: 'v', color: GREEN, label: 'T' }),
          w('bar', 12, 1, 2, 8, 'brake', { dir: 'v', color: RED, label: 'B' }),
          w('gear', 14, 1, 5, 5, 'gear'),
          w('value', 19, 1, 5, 5, 'speed'),
          w('value', 14, 6, 5, 3, 'brakeBias'),
          w('value', 19, 6, 5, 3, 'fuel'),
          w('value', 0, 9, 5, 3, 'airTemp'),
          w('value', 5, 9, 5, 3, 'roadTemp'),
          w('text', 10, 9, 9, 3, 'track', { label: '@track' }),
          w('clock', 19, 9, 5, 3)
        ]
      }
    ]
  },
  {
    ...base, id: 'road-car', name: 'Road car', kind: 'car', theme: theme('#38bdf8'),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('rpm', 0, 0, 24, 1, 'rpmPct'),
          w('gauge', 0, 1, 8, 8, 'speed'),
          w('lamp', 8, 1, 3, 2, 'blinkL', { icon: 'left', color: GREEN }),
          w('lamp', 11, 1, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
          w('lamp', 13, 1, 3, 2, 'blinkR', { icon: 'right', color: GREEN }),
          w('gear', 8, 3, 8, 6, 'gear'),
          w('gauge', 16, 1, 8, 8, 'rpm', { redFrom: 0.88 }),
          w('value', 0, 9, 5, 3, 'fuelPct', { label: '@fuel' }),
          w('value', 5, 9, 5, 3, 'waterTemp'),
          w('value', 10, 9, 4, 3, 'turbo'),
          w('lamp', 14, 9, 2, 3, 'handbrake', { icon: 'park', color: RED }),
          w('lamp', 16, 9, 2, 3, 'abs', { label: 'ABS', color: AMBER }),
          w('lamp', 18, 9, 2, 3, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 20, 9, 2, 3, 'oilWarn', { icon: 'warn', color: RED }),
          w('lamp', 22, 9, 2, 3, 'batteryWarn', { icon: 'bolt', color: RED })
        ]
      }
    ]
  },
  {
    ...base, id: 'truck', name: 'Truck & bus', kind: 'truck', theme: theme('#fbbf24'),
    pages: [
      {
        name: 'Drive',
        widgets: [
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
          w('lamp', 21, 0, 3, 2, 'blinkR', { icon: 'right', color: GREEN }),
          w('value', 0, 2, 9, 6, 'speed', { warn: 'overLimit' }),
          w('limit', 9, 2, 4, 4, 'speedLimit'),
          w('value', 9, 6, 4, 2, 'cruise', { label: 'CC' }),
          w('gear', 13, 2, 5, 6, 'gear'),
          w('gauge', 18, 2, 6, 6, 'rpm', { redFrom: 0.8 }),
          w('bar', 0, 8, 9, 1, 'fuelPct', { color: AMBER }),
          w('value', 0, 9, 5, 3, 'fuel'),
          w('value', 5, 9, 4, 3, 'fuelRange'),
          w('value', 9, 8, 5, 2, 'restStop'),
          w('value', 9, 10, 5, 2, 'deadline'),
          w('text', 14, 8, 10, 2, 'destination', { label: '@destination' }),
          w('value', 14, 10, 5, 2, 'gameClock'),
          w('value', 19, 10, 5, 2, 'retarder')
        ]
      },
      {
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
      }
    ]
  },
  {
    ...base, id: 'glass-cockpit', name: 'Glass cockpit', kind: 'plane', theme: theme('#34d399', '#04080c', '#0d141b'),
    pages: [
      {
        name: 'PFD',
        widgets: [
          w('value', 0, 0, 5, 4, 'ias', { label: 'IAS' }),
          w('value', 0, 4, 5, 3, 'groundSpeed', { label: 'GS' }),
          w('value', 0, 7, 5, 2, 'heading', { label: 'HDG', dec: 0 }),
          w('lamp', 0, 9, 3, 3, 'gearDown', { label: 'GEAR', color: GREEN }),
          w('value', 3, 9, 2, 3, 'flaps', { label: 'FLP' }),
          w('attitude', 5, 0, 13, 9),
          w('compass', 5, 9, 13, 3, 'heading'),
          w('value', 18, 0, 6, 4, 'altitude', { label: 'ALT' }),
          w('value', 18, 4, 6, 3, 'vs', { label: 'VS' }),
          w('lamp', 18, 7, 6, 2, 'apMaster', { label: 'AP', color: GREEN }),
          w('lamp', 18, 9, 2, 3, 'apHdg', { label: 'HDG', color: GREEN }),
          w('lamp', 20, 9, 2, 3, 'apAlt', { label: 'ALT', color: GREEN }),
          w('lamp', 22, 9, 2, 3, 'apNav', { label: 'NAV', color: GREEN })
        ]
      },
      {
        name: 'Map',
        widgets: [
          w('map', 0, 0, 18, 12),
          w('value', 18, 0, 6, 2, 'altitude', { label: 'ALT' }),
          w('value', 18, 2, 6, 2, 'ias', { label: 'IAS' }),
          w('value', 18, 4, 6, 2, 'heading', { label: 'HDG', dec: 0 }),
          w('value', 18, 6, 6, 2, 'wpDistance', { label: 'WPT' }),
          w('value', 18, 8, 6, 2, 'wpEte', { label: 'ETE' }),
          w('value', 18, 10, 6, 2, 'windSpeed', { label: '@wind' })
        ]
      },
      {
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
      }
    ]
  },
  {
    ...base, id: 'inputs', name: 'Wheel inputs', kind: 'any', theme: theme('#38bdf8'),
    pages: [
      {
        name: 'Inputs',
        widgets: [
          w('bar', 0, 0, 24, 2, 'steer', { color: '#38bdf8', min: -1, max: 1, center: true }),
          w('bar', 0, 2, 4, 10, 'clutch', { dir: 'v', color: BLUE, label: 'C' }),
          w('bar', 4, 2, 4, 10, 'brake', { dir: 'v', color: RED, label: 'B' }),
          w('bar', 8, 2, 4, 10, 'throttle', { dir: 'v', color: GREEN, label: 'T' }),
          w('gear', 12, 2, 12, 7, 'gear'),
          w('clock', 12, 9, 12, 3)
        ]
      }
    ]
  },
  {
    ...base, id: 'idle', name: 'Standby', kind: 'any', theme: theme('#38bdf8'),
    pages: [{ name: 'Standby', widgets: [w('clock', 3, 2, 18, 6, undefined, { seconds: true, date: true }), w('text', 3, 8, 18, 2, undefined, { text: '@waiting', dimText: true })] }]
  }
]

/** Layout used for a game until the user picks another one. */
export const DEFAULT_LAYOUT: Record<string, string> = {
  ac: 'race-gt', acevo: 'race-gt', beamng: 'road-car', ets2: 'truck', ats: 'truck', motortown: 'truck', msfs: 'glass-cockpit', wheel: 'inputs'
}
