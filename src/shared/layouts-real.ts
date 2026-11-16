// Layouts modelled on real vehicles: the arrangement, scales and colors of the instrument cluster,
// drawn with PitGlass widgets. They are impressions, not copies: no logos, and the centre displays
// show what the games publish. `note` says which vehicle each one follows.
import { AMBER, GREEN, PURPLE, RED, base, gpsWidgets, jobPage, look, truckLamps, w } from './layoutkit.ts'
import type { Layout, Page, Widget } from './types.ts'

const gps = (): Page => ({ name: 'GPS', widgets: gpsWidgets() })
/** truck tachometer: x100 scale to 2500 with the green economy band and the red zone */
const truckTach = (x: number, y: number, size: number, p: Widget['p'] = {}): Widget => w('dial', x, y, size, size, 'rpm', { max: 2500, step: 500, greenFrom: 0.4, greenTo: 0.6, redFrom: 0.9, ...p })
const lapRow = (y: number, h: number): Widget[] => [
  w('value', 0, y, 6, h, 'lapCurrent'),
  w('value', 6, y, 6, h, 'lapLast'),
  w('value', 12, y, 6, h, 'lapBest', { color: PURPLE }),
  w('value', 18, y, 3, h, 'position', { label: 'POS' }),
  w('value', 21, y, 3, h, 'lap', { label: 'LAP' })
]

export const REAL: Layout[] = [
  // ------------------------------------------------------------------ cars
  {
    ...base, id: 'real-458', name: 'Italia V8', kind: 'car', note: 'After the Ferrari 458 Italia: a yellow tachometer between two displays',
    theme: look({ accent: '#e11d2a', bg: '#070707', panel: '#101012', text: '#f5f5f5', dim: '#8d8d92', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('tyres', 0, 0, 7, 5),
          w('value', 0, 5, 7, 3, 'fuel'),
          w('value', 0, 8, 4, 4, 'brakeBias', { label: 'BIAS' }),
          w('lamp', 4, 8, 3, 2, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 4, 10, 3, 2, 'abs', { label: 'ABS', color: AMBER }),
          w('dial', 7, 0, 10, 10, 'rpm', { max: 10000, step: 1000, redFrom: 0.9, label: ' ', color: '#c40000', uiPanel: '#f6c700', uiText: '#141414', uiDim: '#4a3c00' }),
          w('gear', 10, 6, 4, 3, 'gear', { uiBare: true, uiText: '#141414' }),
          w('value', 7, 10, 10, 2, 'lapCurrent'),
          w('value', 17, 0, 7, 5, 'speed'),
          w('value', 17, 5, 7, 2, 'lapLast'),
          w('value', 17, 7, 7, 2, 'lapBest', { color: PURPLE }),
          w('value', 17, 9, 3, 3, 'position', { label: 'POS' }),
          w('value', 20, 9, 4, 3, 'lap', { label: 'LAP' })
        ]
      }
    ]
  },
  {
    ...base, id: 'real-f40', name: "Twin-turbo '87", kind: 'car', note: 'After the Ferrari F40: orange numerals on black, with a boost gauge',
    theme: look({ accent: '#ff8a1f', bg: '#09090a', panel: '#0e0e10', text: '#ff9a3c', dim: '#b0642a', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 0, 9, 9, 'speed', { max: 360, step: 40 }),
          w('dial', 9, 0, 9, 9, 'rpm', { max: 10000, step: 1000, redFrom: 0.775 }),
          w('dial', 18, 0, 6, 5, 'turbo', { label: 'BOOST', max: 1.6, step: 0.4 }),
          w('dial', 18, 5, 6, 4, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('gear', 0, 9, 3, 3, 'gear'),
          w('value', 3, 9, 7, 3, 'lapCurrent'),
          w('value', 10, 9, 7, 3, 'lapLast'),
          w('value', 17, 9, 7, 3, 'lapBest')
        ]
      }
    ]
  },
  {
    ...base, id: 'real-911', name: 'Five dials', kind: 'car', note: 'After the Porsche 911 GT3: the tachometer in the middle, yellow needles',
    theme: look({ accent: '#ffd400', bg: '#0a0a0b', panel: '#0b0b0c', text: '#f4f4f4', dim: '#8f8f94', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 3, 4, 5, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('value', 0, 8, 4, 4, 'position', { label: 'POS' }),
          w('dial', 4, 1, 5, 8, 'speed', { max: 350, step: 50 }),
          w('value', 4, 9, 5, 3, 'speed'),
          w('dial', 9, 0, 10, 10, 'rpm', { max: 9000, step: 1000, redFrom: 0.95, label: ' ' }),
          w('gear', 12, 6, 4, 3, 'gear', { uiBare: true }),
          w('value', 9, 10, 10, 2, 'lapBest', { color: PURPLE }),
          w('value', 19, 1, 5, 3, 'lapCurrent'),
          w('value', 19, 4, 5, 3, 'lapLast'),
          w('tyres', 19, 7, 5, 5)
        ]
      }
    ]
  },
  {
    ...base, id: 'real-e30', name: "Touring car '87", kind: 'car', note: 'After the BMW M3 E30: two big dials, red needles, amber light',
    theme: look({ accent: '#ff3b1f', bg: '#0a0908', panel: '#0d0c0b', text: '#ffd9a0', dim: '#a8895f', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 0, 9, 9, 'speed', { max: 260, step: 20 }),
          w('dial', 9, 0, 6, 5, 'fuelPct', { label: '@fuel', marks: '0,½,1' }),
          w('gear', 9, 5, 6, 4, 'gear'),
          w('dial', 15, 0, 9, 9, 'rpm', { max: 8000, step: 1000, redFrom: 0.91 }),
          ...lapRow(9, 3)
        ]
      }
    ]
  },
  {
    ...base, id: 'real-ae86', name: 'Hachi-roku', kind: 'car', note: 'After the Toyota AE86 Trueno: 180 km/h speedometer, 8000 rpm tachometer',
    theme: look({ accent: '#ff7a00', bg: '#080808', panel: '#0c0c0c', text: '#f5f5f5', dim: '#9a9a9a', font: 'condensed', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 0, 9, 9, 'speed', { max: 180, step: 20 }),
          w('dial', 9, 0, 9, 9, 'rpm', { max: 8000, step: 1000, redFrom: 0.95 }),
          w('dial', 18, 0, 6, 4, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('tyres', 18, 4, 6, 5),
          w('gear', 0, 9, 3, 3, 'gear'),
          w('value', 3, 9, 7, 3, 'lapCurrent'),
          w('value', 10, 9, 7, 3, 'lapLast'),
          w('value', 17, 9, 7, 3, 'lapBest', { color: PURPLE })
        ]
      }
    ]
  },
  {
    ...base, id: 'real-gtr', name: 'Multi-function', kind: 'car', note: 'After the Nissan GT-R R35: central tachometer, big gear number, and its data screen as a second page',
    theme: look({ accent: '#e60012', bg: '#07070a', panel: '#101015', text: '#f1f1f1', dim: '#8a8a94', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('dial', 0, 2, 7, 7, 'speed', { max: 340, step: 40 }),
          w('value', 0, 9, 7, 3, 'speed'),
          w('dial', 7, 0, 10, 10, 'rpm', { max: 9000, step: 1000, redFrom: 0.78 }),
          w('value', 7, 10, 10, 2, 'lapCurrent'),
          w('gear', 17, 0, 7, 6, 'gear', { color: '#ff2a2a' }),
          w('bar', 17, 6, 7, 2, 'fuelPct', { color: AMBER, label: '@fuel' }),
          w('value', 17, 8, 7, 2, 'turbo'),
          w('value', 17, 10, 7, 2, 'lapBest', { color: PURPLE })
        ]
      },
      {
        name: 'Data',
        widgets: [
          w('gauge', 0, 0, 8, 6, 'turbo'),
          w('gauge', 8, 0, 8, 6, 'throttle', { color: GREEN }),
          w('gauge', 16, 0, 8, 6, 'brake', { color: RED }),
          w('tyres', 0, 6, 8, 6),
          w('value', 8, 6, 8, 3, 'lapCurrent'),
          w('value', 8, 9, 8, 3, 'lapLast'),
          w('gauge', 16, 6, 8, 6, 'fuelPct', { color: AMBER })
        ]
      }
    ]
  },
  {
    ...base, id: 'real-huracan', name: 'V10 screen', kind: 'car', note: 'After the Lamborghini Huracán: one screen with the tachometer in the middle',
    theme: look({ accent: '#f5d000', bg: '#000000', panel: '#08090b', text: '#ffffff', dim: '#8a8f98', font: 'condensed' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('value', 0, 0, 7, 5, 'speed'),
          w('bar', 0, 5, 7, 2, 'fuelPct', { color: '#f5d000', label: '@fuel' }),
          w('tyres', 0, 7, 7, 5),
          w('gauge', 7, 0, 10, 10, 'rpm', { redFrom: 0.88 }),
          w('rpm', 7, 10, 10, 2, 'rpmPct'),
          w('gear', 17, 0, 7, 6, 'gear', { color: '#f5d000' }),
          w('value', 17, 6, 7, 2, 'lapCurrent'),
          w('value', 17, 8, 7, 2, 'lapLast'),
          w('value', 17, 10, 7, 2, 'lapBest', { color: PURPLE })
        ]
      }
    ]
  },
  {
    ...base, id: 'real-gt3', name: 'GT3 display', kind: 'car', note: 'After the data displays of GT3 race cars: gear in the middle, tyres in the corners',
    theme: look({ accent: '#22c55e', bg: '#000000', panel: '#000000', text: '#ffffff', dim: '#9aa4b2', font: 'condensed', style: 'outline' }),
    pages: [
      {
        name: 'Race',
        widgets: [
          w('rpm', 0, 0, 24, 2, 'rpmPct'),
          w('value', 0, 2, 4, 2, 'tyreFL', { label: 'FL' }),
          w('lamp', 0, 4, 4, 3, 'tc', { label: 'TC', color: AMBER }),
          w('lamp', 0, 7, 4, 2, 'abs', { label: 'ABS', color: AMBER }),
          w('value', 0, 9, 4, 3, 'tyreRL', { label: 'RL' }),
          w('value', 4, 2, 5, 3, 'speed', { color: '#22d3ee' }),
          w('value', 4, 5, 5, 2, 'position', { label: 'POS' }),
          w('value', 4, 7, 5, 2, 'lap', { label: 'LAP' }),
          w('gear', 9, 2, 6, 7, 'gear', { color: '#facc15' }),
          w('value', 15, 2, 5, 3, 'lapCurrent'),
          w('value', 15, 5, 5, 2, 'lapLast'),
          w('value', 15, 7, 5, 2, 'lapBest', { color: PURPLE }),
          w('value', 20, 2, 4, 2, 'tyreFR', { label: 'FR' }),
          w('value', 20, 4, 4, 3, 'brakeBias', { label: 'BIAS', color: '#f97316' }),
          w('value', 20, 7, 4, 2, 'fuel', { color: GREEN }),
          w('value', 20, 9, 4, 3, 'tyreRR', { label: 'RR' }),
          w('tach', 4, 9, 16, 3, 'rpm', { redFrom: 0.9 })
        ]
      }
    ]
  },
  // ------------------------------------------------------------------ trucks
  {
    ...base, id: 'real-scania', name: 'Swedish twin-dial', kind: 'truck', note: 'After the Scania R/S (DAF XF and Iveco S-Way are close): tachometer left, speedometer right',
    theme: look({ accent: '#e11d2a', bg: '#06070a', panel: '#0b0d11', text: '#f5f7fa', dim: '#8d97a5', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          truckTach(0, 2, 8),
          w('gear', 8, 2, 4, 4, 'gear'),
          w('limit', 12, 2, 4, 4, 'speedLimit'),
          w('value', 8, 6, 4, 2, 'cruise', { label: 'CC' }),
          w('value', 12, 6, 4, 2, 'navDistance', { label: 'NAV' }),
          w('value', 8, 8, 8, 2, 'odometer'),
          w('dial', 16, 2, 8, 8, 'speed', { max: 140, step: 20 }),
          w('value', 0, 10, 4, 2, 'fuel'),
          w('value', 4, 10, 4, 2, 'adblue'),
          w('value', 8, 10, 4, 2, 'waterTemp', { label: 'TEMP' }),
          w('value', 12, 10, 4, 2, 'airPressure', { label: 'AIR' }),
          w('value', 16, 10, 4, 2, 'restStop'),
          w('value', 20, 10, 4, 2, 'gameClock')
        ]
      },
      jobPage(),
      gps()
    ]
  },
  {
    ...base, id: 'real-actros', name: 'German twin-dial', kind: 'truck', note: 'After the Mercedes-Benz Actros (2011): speedometer left, tachometer right, small gauges below',
    theme: look({ accent: '#ff6a1a', bg: '#070707', panel: '#0c0c0d', text: '#f3f3f0', dim: '#93938c', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          w('dial', 0, 2, 7, 7, 'speed', { max: 140, step: 20 }),
          w('gear', 7, 2, 4, 4, 'gear'),
          w('limit', 11, 2, 3, 4, 'speedLimit'),
          w('value', 14, 2, 3, 4, 'cruise', { label: 'CC' }),
          w('value', 7, 6, 5, 3, 'navDistance', { label: 'NAV' }),
          w('value', 12, 6, 5, 3, 'navTime', { label: 'ETA' }),
          truckTach(17, 2, 7),
          w('dial', 0, 9, 4, 3, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('dial', 4, 9, 4, 3, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('dial', 8, 9, 4, 3, 'airPressure', { label: 'AIR', max: 12, step: 4 }),
          w('dial', 12, 9, 4, 3, 'oilPressure', { label: 'OIL', max: 8, step: 4 }),
          w('value', 16, 9, 4, 3, 'adblue'),
          w('value', 20, 9, 4, 3, 'gameClock')
        ]
      },
      jobPage(),
      gps()
    ]
  },
  {
    ...base, id: 'real-fh', name: 'Big speedometer', kind: 'truck', note: 'After the Volvo FH (2012): a small tachometer, one large speedometer, information on the right',
    theme: look({ accent: '#ff5a1f', bg: '#060708', panel: '#0c0e11', text: '#f4f6f8', dim: '#8c96a3', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          truckTach(0, 2, 6),
          w('dial', 0, 8, 3, 4, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('dial', 3, 8, 3, 4, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('dial', 6, 2, 10, 10, 'speed', { max: 140, step: 20, digital: true }),
          w('gear', 16, 2, 4, 4, 'gear'),
          w('limit', 20, 2, 4, 4, 'speedLimit'),
          w('value', 16, 6, 4, 2, 'cruise', { label: 'CC' }),
          w('value', 20, 6, 4, 2, 'navDistance', { label: 'NAV' }),
          w('text', 16, 8, 8, 2, 'destination', { label: '@destination' }),
          w('value', 16, 10, 4, 2, 'restStop'),
          w('value', 20, 10, 4, 2, 'gameClock')
        ]
      },
      jobPage(),
      gps()
    ]
  },
  {
    ...base, id: 'real-cockpit', name: 'Screen cockpit', kind: 'truck', note: 'After the all-screen clusters: Mercedes-Benz Actros (2018), DAF XG, Volvo FH (2020), MAN TGX',
    theme: look({ accent: '#38bdf8', bg: '#000000', panel: '#05080c', text: '#ffffff', dim: '#7f8ea3' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          w('lamp', 0, 0, 3, 2, 'blinkL', { icon: 'left', color: GREEN }),
          w('text', 3, 0, 9, 2, 'destination', { label: '@destination' }),
          w('value', 12, 0, 5, 2, 'navDistance', { label: 'NAV' }),
          w('value', 17, 0, 4, 2, 'navTime', { label: 'ETA' }),
          w('lamp', 21, 0, 3, 2, 'blinkR', { icon: 'right', color: GREEN }),
          w('gauge', 0, 2, 8, 8, 'speed', { max: 130 }),
          w('limit', 8, 2, 4, 4, 'speedLimit'),
          w('gear', 12, 2, 4, 4, 'gear'),
          w('value', 8, 6, 4, 2, 'cruise', { label: 'CC' }),
          w('value', 12, 6, 4, 2, 'retarder'),
          w('bar', 8, 8, 8, 2, 'fuelPct', { color: '#38bdf8', label: '@fuel' }),
          w('gauge', 16, 2, 8, 8, 'rpm', { max: 2500, redFrom: 0.9 }),
          w('value', 0, 10, 4, 2, 'fuel'),
          w('value', 4, 10, 4, 2, 'fuelRange'),
          w('value', 8, 10, 4, 2, 'adblue'),
          w('value', 12, 10, 4, 2, 'airPressure', { label: 'AIR' }),
          w('value', 16, 10, 4, 2, 'waterTemp', { label: 'TEMP' }),
          w('value', 20, 10, 4, 2, 'gameClock')
        ]
      },
      jobPage(),
      gps()
    ]
  },
  // ------------------------------------------------------------------ coaches
  {
    ...base, id: 'real-coach', name: 'Grand tourer coach', kind: 'truck', note: "After the MAN Lion's Coach: tachometer left, speedometer right, small gauges between",
    theme: look({ accent: '#e53935', bg: '#060708', panel: '#0c0d10', text: '#f5f5f5', dim: '#9097a1', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          truckTach(0, 2, 7, { greenTo: 0.64, redFrom: 0.86 }),
          w('dial', 7, 2, 5, 3, 'fuelPct', { label: '@fuel', marks: 'E,½,F' }),
          w('dial', 12, 2, 5, 3, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('gear', 7, 5, 3, 4, 'gear'),
          w('limit', 10, 5, 4, 4, 'speedLimit'),
          w('value', 14, 5, 3, 4, 'cruise', { label: 'CC' }),
          w('dial', 17, 2, 7, 7, 'speed', { max: 125, step: 25 }),
          w('dial', 0, 9, 4, 3, 'airPressure', { label: 'AIR', max: 12, step: 4 }),
          w('dial', 4, 9, 4, 3, 'oilPressure', { label: 'OIL', max: 8, step: 4 }),
          w('value', 8, 9, 4, 3, 'battery', { label: 'BATT' }),
          w('value', 12, 9, 4, 3, 'retarder'),
          w('value', 16, 9, 4, 3, 'odometer'),
          w('value', 20, 9, 4, 3, 'gameClock')
        ]
      },
      gps()
    ]
  },
  {
    ...base, id: 'real-coach-br', name: 'Rodoviário', kind: 'truck', note: 'After Brazilian coaches on Mercedes-Benz O 500 chassis: speedometer left, tachometer right, air and oil pressure in the middle',
    theme: look({ accent: '#ff5722', bg: '#070605', panel: '#0d0b09', text: '#ffe2ad', dim: '#a8895a', style: 'bezel' }),
    pages: [
      {
        name: 'Drive',
        widgets: [
          ...truckLamps(),
          w('dial', 0, 2, 7, 7, 'speed', { max: 140, step: 20 }),
          w('dial', 7, 2, 5, 3, 'airPressure', { label: 'AR', max: 12, step: 4 }),
          w('dial', 12, 2, 5, 3, 'oilPressure', { label: 'ÓLEO', max: 8, step: 4 }),
          w('gear', 7, 5, 3, 4, 'gear'),
          w('limit', 10, 5, 4, 4, 'speedLimit'),
          w('value', 14, 5, 3, 4, 'cruise', { label: 'CC' }),
          truckTach(17, 2, 7),
          w('dial', 0, 9, 4, 3, 'fuelPct', { label: '@fuel', marks: '0,½,1' }),
          w('dial', 4, 9, 4, 3, 'waterTemp', { label: 'TEMP', marks: 'C,,H' }),
          w('value', 8, 9, 4, 3, 'battery', { label: 'BATT' }),
          w('value', 12, 9, 4, 3, 'navDistance', { label: 'NAV' }),
          w('value', 16, 9, 4, 3, 'odometer'),
          w('value', 20, 9, 4, 3, 'gameClock')
        ]
      },
      gps()
    ]
  }
]
