// Layouts shipped with PitGlass. They are read-only: duplicate one in the editor to change it.
// All use a 24 x 12 grid, drawn for a phone lying sideways (2:1), and stretch to any screen.
import type { Layout, Page, Theme, Widget } from './types.ts'

let seq = 0
const w = (type: string, x: number, y: number, ww: number, h: number, ch?: string, p: Widget['p'] = {}): Widget => ({ id: `b${++seq}`, type, x, y, w: ww, h, ch, p })
const theme = (accent: string, bg = '#05070a', panel = '#0f141b'): Theme => ({ bg, panel, text: '#f1f5f9', dim: '#7c8a9c', accent })
/** theme with everything spelled out: colors, typeface, panel style */
const look = (t: Partial<Theme> & { accent: string }): Theme => ({ bg: '#05070a', panel: '#0f141b', text: '#f1f5f9', dim: '#7c8a9c', ...t })
const base = { pitglass: 1 as const, cols: 24, rows: 12, author: 'PitGlass', builtin: true }

const RED = '#ef4444'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'
const BLUE = '#3b82f6'
const PURPLE = '#a855f7'

/** The row of warning lights across the top of a truck dashboard. */
const truckLamps = (): Widget[] => [
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

/** Pages shared by more than one layout. */
const autopilotPage = (): Page => ({
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

const jobPage = (): Page => ({
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
          ...truckLamps(),
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
      jobPage()
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
      autopilotPage()
    ]
  },
  // ------------------------------------------------------------------ cars
  {
    ...base, id: 'formula', name: 'Formula', kind: 'car', theme: look({ accent: '#22d3ee', bg: '#000000', panel: '#000000', dim: '#6b7280', font: 'condensed', style: 'outline' }),
    pages: [
      {
        name: 'Race',
        widgets: [
          w('rpm', 0, 0, 24, 2, 'rpmPct', { segments: 15, from: 0.5 }),
          w('value', 0, 2, 7, 3, 'speed'),
          w('value', 0, 5, 7, 2, 'lapCurrent'),
          w('value', 0, 7, 7, 2, 'lapLast'),
          w('value', 0, 9, 7, 3, 'lapBest', { color: PURPLE }),
          w('gear', 7, 2, 10, 7, 'gear'),
          w('value', 7, 9, 3, 3, 'position', { label: 'POS' }),
          w('value', 10, 9, 4, 3, 'lap'),
          w('value', 14, 9, 3, 3, 'fuel', { color: AMBER }),
          w('tyres', 17, 2, 7, 4),
          w('value', 17, 6, 7, 2, 'brakeBias', { label: 'BBAL' }),
          w('value', 17, 8, 7, 2, 'waterTemp', { warnAbove: 110 }),
          w('lamp', 17, 10, 4, 2, 'pitLimiter', { label: 'PIT', color: BLUE }),
          w('lamp', 21, 10, 3, 2, 'inPit', { label: 'LANE', color: GREEN })
        ]
      }
    ]
  },
  {
    ...base, id: 'formula-classic', name: 'Turbo-era formula', kind: 'car', theme: look({ accent: '#ff6a00', bg: '#08090a', panel: '#0d0e10', text: '#f5f5f0', dim: '#8c8c84', style: 'bezel' }),
    pages: [
      {
        name: 'Gauges',
        widgets: [
          w('dial', 0, 0, 6, 6, 'turbo', { label: 'BOOST' }),
          w('dial', 0, 6, 6, 6, 'waterTemp', { label: 'WATER' }),
          w('dial', 6, 0, 12, 12, 'rpm', { redFrom: 0.86 }),
          w('dial', 18, 0, 6, 6, 'oilTemp', { label: 'OIL' }),
          w('dial', 18, 6, 6, 6, 'fuelPct', { label: '@fuel', marks: 'E,½,F' })
        ]
      }
    ]
  },
  {
    ...base, id: 'datalogger', name: 'Pro datalogger', kind: 'car', theme: look({ accent: '#f97316', bg: '#000000', panel: '#000000', text: '#ffffff', dim: '#8b95a5', font: 'condensed', style: 'outline' }),
    pages: [
      {
        name: 'Dash',
        widgets: [
          w('tach', 0, 0, 24, 3, 'rpm', { curve: true }),
          w('value', 0, 3, 9, 3, 'rpm'),
          w('value', 0, 6, 5, 3, 'speed'),
          w('value', 5, 6, 4, 3, 'turbo', { color: '#22d3ee' }),
          w('gear', 9, 3, 6, 6, 'gear'),
          w('value', 15, 3, 5, 3, 'waterTemp', { color: '#60a5fa', warnAbove: 108 }),
          w('value', 20, 3, 4, 3, 'oilTemp', { color: AMBER, warnAbove: 130 }),
          w('value', 15, 6, 5, 3, 'fuel', { color: GREEN }),
          w('value', 20, 6, 4, 3, 'airTemp'),
          w('value', 0, 9, 6, 3, 'lapLast'),
          w('value', 6, 9, 6, 3, 'lapBest', { color: PURPLE }),
          w('lamp', 12, 9, 3, 3, 'shiftLight', { label: 'SHIFT', color: RED }),
          w('lamp', 15, 9, 3, 3, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 18, 9, 3, 3, 'abs', { label: 'ABS', color: AMBER }),
          w('lamp', 21, 9, 3, 3, 'pitLimiter', { label: 'PIT', color: BLUE })
        ]
      },
      {
        name: 'Launch',
        widgets: [
          w('tach', 0, 0, 24, 2, 'rpm'),
          w('digits', 0, 2, 13, 5, 'rpm', { digits: 5 }),
          w('digits', 13, 2, 11, 5, 'speed', { digits: 3, color: '#ffffff' }),
          w('bar', 0, 7, 12, 1, 'throttle', { color: GREEN }),
          w('bar', 12, 7, 12, 1, 'brake', { color: RED }),
          w('value', 0, 8, 6, 4, 'turbo', { color: '#22d3ee' }),
          w('value', 6, 8, 6, 4, 'waterTemp', { color: '#60a5fa', warnAbove: 108 }),
          w('value', 12, 8, 6, 4, 'oilTemp', { color: AMBER, warnAbove: 130 }),
          w('gear', 18, 8, 6, 4, 'gear')
        ]
      }
    ]
  },
  {
    ...base, id: 'classic', name: "Classic '60s", kind: 'car', theme: look({ accent: '#c2410c', bg: '#17110c', panel: '#efe6d0', text: '#1c1917', dim: '#6b5f52', font: 'serif', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 0, 9, 9, 'speed'),
          w('dial', 9, 0, 6, 4, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('lamp', 9, 4, 2, 1, 'blinkL', { icon: 'left', color: '#15803d' }),
          w('lamp', 11, 4, 2, 1, 'highBeam', { icon: 'high', color: '#1d4ed8' }),
          w('lamp', 13, 4, 2, 1, 'blinkR', { icon: 'right', color: '#15803d' }),
          w('dial', 9, 5, 6, 4, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('dial', 15, 0, 9, 9, 'rpm', { redFrom: 0.8 }),
          w('lamp', 0, 9, 3, 3, 'handbrake', { icon: 'park', color: '#b91c1c' }),
          w('lamp', 3, 9, 3, 3, 'oilWarn', { icon: 'warn', color: '#b91c1c' }),
          w('lamp', 6, 9, 3, 3, 'batteryWarn', { icon: 'bolt', color: '#b91c1c' }),
          w('gear', 9, 9, 6, 3, 'gear'),
          w('value', 15, 9, 5, 3, 'oilTemp'),
          w('clock', 20, 9, 4, 3)
        ]
      }
    ]
  },
  {
    ...base, id: 'retro-digital', name: "Digital '84", kind: 'car', theme: look({ accent: '#34f5a0', bg: '#010302', panel: '#04100a', text: '#b9ffdc', dim: '#2f8f66', font: 'mono' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('tach', 0, 0, 24, 4, 'rpm', { curve: true, segments: 40 }),
          w('digits', 0, 4, 11, 6, 'speed', { digits: 3 }),
          w('digits', 11, 4, 4, 6, 'gear', { digits: 1, color: AMBER }),
          w('digits', 15, 4, 9, 3, 'rpm', { digits: 5 }),
          w('digits', 15, 7, 5, 3, 'waterTemp', { digits: 3 }),
          w('digits', 20, 7, 4, 3, 'fuel', { digits: 3 }),
          w('bar', 0, 10, 7, 2, 'fuelPct', { label: '@fuel' }),
          w('lamp', 7, 10, 2, 2, 'blinkL', { icon: 'left' }),
          w('lamp', 9, 10, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
          w('lamp', 11, 10, 2, 2, 'handbrake', { icon: 'park', color: RED }),
          w('lamp', 13, 10, 2, 2, 'oilWarn', { icon: 'warn', color: RED }),
          w('lamp', 15, 10, 2, 2, 'batteryWarn', { icon: 'bolt', color: RED }),
          w('lamp', 17, 10, 2, 2, 'blinkR', { icon: 'right' }),
          w('clock', 19, 10, 5, 2)
        ]
      }
    ]
  },
  {
    ...base, id: 'rally', name: 'Rally', kind: 'car', theme: look({ accent: '#facc15', bg: '#0a0a0a', panel: '#17171a', font: 'condensed' }),
    pages: [
      {
        name: 'Stage',
        widgets: [
          w('rpm', 0, 0, 24, 2, 'rpmPct'),
          w('gear', 0, 2, 8, 10, 'gear', { color: '#facc15' }),
          w('value', 8, 2, 10, 5, 'speed'),
          w('bar', 18, 2, 2, 7, 'throttle', { dir: 'v', color: GREEN, label: 'T' }),
          w('bar', 20, 2, 2, 7, 'brake', { dir: 'v', color: RED, label: 'B' }),
          w('bar', 22, 2, 2, 7, 'clutch', { dir: 'v', color: BLUE, label: 'C' }),
          w('value', 8, 7, 5, 3, 'waterTemp', { warnAbove: 110 }),
          w('value', 13, 7, 5, 3, 'oilTemp', { warnAbove: 130 }),
          w('lamp', 8, 10, 3, 2, 'handbrake', { icon: 'park', color: RED }),
          w('value', 11, 10, 4, 2, 'turbo'),
          w('value', 15, 10, 3, 2, 'fuel'),
          w('clock', 18, 9, 6, 3)
        ]
      }
    ]
  },
  {
    ...base, id: 'tuner', name: 'Street tuner', kind: 'car', theme: look({ accent: '#ff2d55', bg: '#060608', panel: '#0e0e14', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 0, 7, 6, 'turbo', { label: 'BOOST' }),
          w('value', 0, 6, 7, 3, 'waterTemp', { warnAbove: 110 }),
          w('value', 0, 9, 7, 3, 'oilTemp', { warnAbove: 130 }),
          w('dial', 7, 0, 10, 10, 'rpm', { redFrom: 0.82 }),
          w('value', 7, 10, 6, 2, 'speed'),
          w('gear', 13, 10, 4, 2, 'gear'),
          w('dial', 17, 0, 7, 6, 'speed'),
          w('value', 17, 6, 4, 3, 'fuel'),
          w('bar', 21, 6, 3, 3, 'fuelPct', { dir: 'v', color: AMBER }),
          w('lamp', 17, 9, 2, 3, 'handbrake', { icon: 'park', color: RED }),
          w('lamp', 19, 9, 2, 3, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 21, 9, 3, 3, 'abs', { label: 'ABS', color: AMBER })
        ]
      }
    ]
  },
  {
    ...base, id: 'night', name: 'Night stint', kind: 'car', theme: look({ accent: '#ff3b30', bg: '#000000', panel: '#0c0202', text: '#ff5a4f', dim: '#8a231c', font: 'condensed' }),
    pages: [
      {
        name: 'Race',
        widgets: [
          w('rpm', 0, 0, 24, 1, 'rpmPct'),
          w('value', 0, 1, 9, 4, 'speed'),
          w('value', 0, 5, 5, 3, 'fuel'),
          w('value', 5, 5, 4, 3, 'lap'),
          w('gear', 9, 1, 6, 7, 'gear'),
          w('value', 15, 1, 9, 2, 'lapCurrent'),
          w('value', 15, 3, 9, 2, 'lapLast'),
          w('value', 15, 5, 9, 3, 'lapBest'),
          w('tyres', 0, 8, 7, 4),
          w('value', 7, 8, 5, 2, 'waterTemp', { warnAbove: 110 }),
          w('value', 7, 10, 5, 2, 'oilTemp', { warnAbove: 130 }),
          w('value', 12, 8, 4, 4, 'position', { label: 'POS' }),
          w('clock', 16, 8, 8, 2),
          w('value', 16, 10, 4, 2, 'airTemp'),
          w('value', 20, 10, 4, 2, 'roadTemp')
        ]
      }
    ]
  },
  // ------------------------------------------------------------------ trucks and buses
  {
    ...base, id: 'truck-classic', name: 'Classic truck', kind: 'truck', theme: look({ accent: '#fb923c', bg: '#090b0a', panel: '#121614', text: '#e9f5e6', dim: '#7f9685', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          w('dial', 0, 2, 8, 8, 'speed', { max: 140 }),
          w('dial', 8, 2, 4, 4, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('dial', 12, 2, 4, 4, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('dial', 8, 6, 4, 4, 'oilTemp', { label: 'OIL', marks: 'C,,H' }),
          w('limit', 12, 6, 4, 4, 'speedLimit'),
          w('dial', 16, 2, 8, 8, 'rpm', { redFrom: 0.8 }),
          w('text', 0, 10, 8, 2, 'destination', { label: '@destination' }),
          w('gear', 8, 10, 3, 2, 'gear'),
          w('value', 11, 10, 5, 2, 'cruise', { label: 'CC' }),
          w('value', 16, 10, 4, 2, 'restStop'),
          w('value', 20, 10, 4, 2, 'gameClock')
        ]
      },
      jobPage()
    ]
  },
  {
    ...base, id: 'truck-digital', name: 'Digital cluster', kind: 'truck', theme: look({ accent: '#38bdf8', bg: '#02050a', panel: '#09111c' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('gauge', 0, 0, 8, 8, 'speed', { max: 140 }),
          w('lamp', 8, 0, 2, 2, 'blinkL', { icon: 'left', color: GREEN }),
          w('limit', 10, 0, 4, 4, 'speedLimit'),
          w('lamp', 14, 0, 2, 2, 'blinkR', { icon: 'right', color: GREEN }),
          w('lamp', 8, 2, 2, 2, 'cruiseOn', { icon: 'cruise', color: GREEN }),
          w('lamp', 14, 2, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
          w('gear', 8, 4, 4, 4, 'gear'),
          w('value', 12, 4, 4, 2, 'cruise', { label: 'CC' }),
          w('value', 12, 6, 4, 2, 'retarder'),
          w('gauge', 16, 0, 8, 8, 'rpm', { redFrom: 0.8 }),
          w('text', 0, 8, 9, 2, 'destination', { label: '@destination' }),
          w('value', 9, 8, 5, 2, 'jobDistance'),
          w('value', 14, 8, 5, 2, 'deadline'),
          w('value', 19, 8, 5, 2, 'restStop'),
          w('value', 0, 10, 4, 2, 'fuel'),
          w('value', 4, 10, 4, 2, 'fuelRange'),
          w('value', 8, 10, 3, 2, 'adblue'),
          w('lamp', 11, 10, 2, 2, 'handbrake', { icon: 'park', color: RED }),
          w('lamp', 13, 10, 2, 2, 'engineBrake', { label: 'EB', color: AMBER }),
          w('lamp', 15, 10, 2, 2, 'airWarn', { label: 'AIR', color: RED }),
          w('lamp', 17, 10, 2, 2, 'fuelWarn', { icon: 'fuel', color: AMBER }),
          w('value', 19, 10, 5, 2, 'gameClock')
        ]
      },
      jobPage()
    ]
  },
  {
    ...base, id: 'coach', name: 'Coach', kind: 'truck', theme: look({ accent: '#a3e635', bg: '#08090c', panel: '#11131a' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('text', 0, 0, 7, 3, 'destination', { label: '@destination' }),
          w('value', 0, 3, 7, 3, 'gameClock'),
          w('value', 0, 6, 7, 2, 'restStop'),
          w('value', 0, 8, 7, 2, 'deadline'),
          w('dial', 7, 0, 10, 10, 'speed', { max: 140, digital: true }),
          w('limit', 17, 0, 4, 4, 'speedLimit'),
          w('gear', 21, 0, 3, 4, 'gear'),
          w('gauge', 17, 4, 7, 6, 'rpm', { redFrom: 0.8 }),
          w('lamp', 0, 10, 3, 2, 'blinkL', { icon: 'left', color: GREEN }),
          w('lamp', 3, 10, 2, 2, 'lowBeam', { icon: 'low', color: GREEN }),
          w('lamp', 5, 10, 2, 2, 'highBeam', { icon: 'high', color: BLUE }),
          w('lamp', 7, 10, 2, 2, 'handbrake', { icon: 'park', color: RED }),
          w('lamp', 9, 10, 2, 2, 'wipers', { icon: 'wiper', color: '#94a3b8' }),
          w('lamp', 11, 10, 2, 2, 'engineBrake', { label: 'EB', color: AMBER }),
          w('value', 13, 10, 4, 2, 'fuelPct', { label: '@fuel' }),
          w('lamp', 17, 10, 2, 2, 'cruiseOn', { icon: 'cruise', color: GREEN }),
          w('lamp', 19, 10, 2, 2, 'airWarn', { label: 'AIR', color: RED }),
          w('lamp', 21, 10, 3, 2, 'blinkR', { icon: 'right', color: GREEN })
        ]
      }
    ]
  },
  // ------------------------------------------------------------------ aircraft
  {
    ...base, id: 'six-pack', name: 'Steam gauges', kind: 'plane', theme: look({ accent: '#fafafa', bg: '#15171a', panel: '#07080a', text: '#f5f5f5', dim: '#9ca3af', style: 'bezel' }),
    pages: [
      {
        name: 'Six pack',
        widgets: [
          w('dial', 0, 0, 6, 6, 'ias', { label: 'AIRSPEED', max: 200, redFrom: 0.8 }),
          w('attitude', 6, 0, 6, 6, undefined, { round: true }),
          w('altimeter', 12, 0, 6, 6, 'altitude'),
          w('value', 18, 0, 6, 2, 'groundSpeed', { label: 'GS' }),
          w('value', 18, 2, 6, 2, 'wpDistance', { label: 'WPT' }),
          w('value', 18, 4, 6, 2, 'wpEte', { label: 'ETE' }),
          w('dial', 0, 6, 6, 6, 'rpm', { max: 3000, redFrom: 0.9 }),
          w('rose', 6, 6, 6, 6, 'heading'),
          w('dial', 12, 6, 6, 6, 'vs', { label: 'VS', min: -2000, max: 2000 }),
          w('lamp', 18, 6, 3, 3, 'gearDown', { label: 'GEAR', color: GREEN }),
          w('value', 21, 6, 3, 3, 'flaps', { label: 'FLP' }),
          w('lamp', 18, 9, 3, 3, 'apMaster', { label: 'AP', color: GREEN }),
          w('value', 21, 9, 3, 3, 'baro', { label: 'BARO' })
        ]
      },
      autopilotPage()
    ]
  },
  {
    ...base, id: 'airliner', name: 'Airliner', kind: 'plane', theme: look({ accent: '#e879f9', bg: '#04060a', panel: '#0a1120' }),
    pages: [
      {
        name: 'PFD + map',
        widgets: [
          w('value', 0, 0, 3, 5, 'ias', { label: 'SPD' }),
          w('value', 0, 5, 3, 3, 'groundSpeed', { label: 'GS' }),
          w('attitude', 3, 0, 7, 8),
          w('value', 10, 0, 4, 5, 'altitude', { label: 'ALT' }),
          w('value', 10, 5, 4, 3, 'vs', { label: 'V/S' }),
          w('compass', 0, 8, 14, 2, 'heading'),
          w('lamp', 0, 10, 2, 2, 'apMaster', { label: 'AP', color: GREEN }),
          w('lamp', 2, 10, 2, 2, 'apHdg', { label: 'HDG', color: GREEN }),
          w('lamp', 4, 10, 2, 2, 'apNav', { label: 'NAV', color: GREEN }),
          w('lamp', 6, 10, 2, 2, 'apAlt', { label: 'ALT', color: GREEN }),
          w('lamp', 8, 10, 2, 2, 'apVs', { label: 'VS', color: GREEN }),
          w('lamp', 10, 10, 2, 2, 'apApr', { label: 'APR', color: GREEN }),
          w('lamp', 12, 10, 2, 2, 'gearDown', { label: 'GEAR', color: GREEN }),
          w('map', 14, 0, 10, 9),
          w('value', 14, 9, 4, 3, 'wpDistance', { label: 'WPT' }),
          w('value', 18, 9, 3, 3, 'wpEte', { label: 'ETE' }),
          w('value', 21, 9, 3, 3, 'flaps', { label: 'FLP' })
        ]
      },
      autopilotPage()
    ]
  },
  {
    ...base, id: 'warbird', name: 'Warbird', kind: 'plane', theme: look({ accent: '#f5d76e', bg: '#191b12', panel: '#0b0c09', text: '#ece7c8', dim: '#93916f', font: 'condensed', style: 'bezel' }),
    pages: [
      {
        name: 'Panel',
        widgets: [
          w('dial', 0, 0, 8, 8, 'ias', { label: 'AIRSPEED' }),
          w('altimeter', 8, 0, 8, 8, 'altitude'),
          w('rose', 16, 0, 8, 8, 'heading'),
          w('dial', 0, 8, 4, 4, 'vs', { label: 'VS', min: -2000, max: 2000 }),
          w('attitude', 4, 8, 4, 4, undefined, { round: true }),
          w('lamp', 8, 8, 4, 2, 'gearDown', { label: 'GEAR', color: GREEN }),
          w('value', 8, 10, 4, 2, 'flaps'),
          w('value', 12, 8, 4, 4, 'heading', { label: 'HDG', dec: 0 }),
          w('value', 16, 8, 4, 4, 'groundSpeed', { label: 'GS' }),
          w('clock', 20, 8, 4, 4)
        ]
      }
    ]
  },
  // ------------------------------------------------------------------ any game
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
