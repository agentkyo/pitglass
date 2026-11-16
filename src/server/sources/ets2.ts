// Euro Truck Simulator 2 / American Truck Simulator through RenCloud's scs-sdk-plugin
// (https://github.com/RenCloud/scs-sdk-plugin): scs-telemetry.dll in <game>\bin\win_x64\plugins
// publishes the shared memory "Local\SCSTelemetry". Offsets are for plugin revision 12 (V.1.12.1).
import { fmtDuration, type Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'
import { SharedMemory, cstr } from '../win32.ts'
import { scsToLatLon } from './scsmap.ts'
import { round, type Source } from './source.ts'

const MAP_SIZE = 21600
const STALE_MS = 2000
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const O = {
  sdkActive: 0, paused: 4, renderTime: 24, pluginRev: 40, game: 52, timeAbs: 64,
  retarderStepCount: 76, deliveryTime: 88, plannedDistanceKm: 100, retarderBrake: 108,
  restStop: 500, gearDashboard: 508, fuelCapacity: 704, engineRpmMax: 740,
  // truck_f is a run of floats from 948: speed, rpm, userSteer, userThrottle, userBrake, userClutch,
  // game{Steer,Throttle,Brake,Clutch}, cruise (988), airPressure, brakeTemp, fuel (1000), avg, range,
  // adblue, oilPressure, oilTemp, waterTemp, battery, dashLights, wearEngine (1036)
  speed: 948, engineRpm: 952, userThrottle: 960, userBrake: 964, userClutch: 968,
  cruiseControlSpeed: 988, airPressure: 992, brakeTemperature: 996, fuel: 1000, fuelAvgConsumption: 1004, fuelRange: 1008, adblue: 1012,
  oilPressure: 1016, oilTemperature: 1020, waterTemperature: 1024, batteryVoltage: 1028, odometer: 1056,
  wearEngine: 1036, wearTransmission: 1040, wearCabin: 1044, wearChassis: 1048, wearWheels: 1052, routeDistance: 1060, routeTime: 1064,
  speedLimit: 1068, cargoDamage: 1468,
  parkBrake: 1566, motorBrake: 1567, airPressureWarning: 1568, fuelWarning: 1570,
  wipers: 1577, blinkerLeftOn: 1580, blinkerRightOn: 1581, lightsParking: 1582, lightsBeamLow: 1583,
  lightsBeamHigh: 1584, lightsBeacon: 1585, lightsHazard: 1588, cruiseControl: 1589,
  truckBrand: 2364, truckName: 2492, cargo: 2620, cityDst: 2748, citySrc: 3004,
  // truck placement, doubles: world x/y/z in metres, then heading/pitch/roll as fractions of a turn
  coordinateX: 2200, coordinateZ: 2216, rotationX: 2224,
  jobIncome: 4000, onJob: 4300, trailerAttached: 6080
} as const

export const fmtGear = (g: number) => (g === 0 ? 'N' : g > 0 ? String(g) : `R${g < -1 ? -g : ''}`)

/** Pure decoder. Returns null when the SDK is not active. */
export function decodeScs(b: Buffer): Frame | null {
  if (b[O.sdkActive] === 0) return null
  const flag = (off: number) => b[off] !== 0
  const f = (off: number) => b.readFloatLE(off)
  const tabs = b.readUInt32LE(O.timeAbs)
  const delivery = b.readUInt32LE(O.deliveryTime)
  const onJob = flag(O.onJob)
  const limit = f(O.speedLimit) * 3.6
  const wear = Math.max(f(O.wearEngine), f(O.wearTransmission), f(O.wearCabin), f(O.wearChassis), f(O.wearWheels))
  const rest = b.readInt32LE(O.restStop)
  const game = b.readUInt32LE(O.game) === 2 ? 'ats' : 'ets2'
  const x = b.readDoubleLE(O.coordinateX)
  const z = b.readDoubleLE(O.coordinateZ)
  // (0, 0) is what the plugin holds before a truck exists
  const placed = isFinite(x) && isFinite(z) && (x !== 0 || z !== 0)
  const [lat, lon] = placed ? scsToLatLon(game, x, z) : [NaN, NaN]
  const turn = b.readDoubleLE(O.rotationX)
  const route = f(O.routeDistance)
  const frame: Frame = {
    game,
    posX: placed ? round(x, 1) : null,
    posZ: placed ? round(z, 1) : null,
    lat: isFinite(lat) ? round(lat, 5) : null,
    lon: isFinite(lon) ? round(lon, 5) : null,
    // the game counts counterclockwise from north
    heading: placed && isFinite(turn) ? round((((1 - turn) * 360) % 360 + 360) % 360) : null,
    navDistance: route > 0 ? round(route / 1000, route < 10000 ? 1 : 0) : null,
    navTime: route > 0 && f(O.routeTime) > 0 ? fmtDuration(f(O.routeTime) / 60) : '',
    vehicle: `${cstr(b, O.truckBrand, 64)} ${cstr(b, O.truckName, 64)}`.trim(),
    paused: flag(O.paused),
    speed: round(Math.abs(f(O.speed)) * 3.6),
    rpm: round(f(O.engineRpm)),
    rpmMax: round(f(O.engineRpmMax)),
    gear: fmtGear(b.readInt32LE(O.gearDashboard)),
    throttle: f(O.userThrottle),
    brake: f(O.userBrake),
    clutch: f(O.userClutch),
    cruise: round(f(O.cruiseControlSpeed) * 3.6),
    cruiseOn: flag(O.cruiseControl),
    speedLimit: limit > 0 ? round(limit) : null,
    fuel: round(f(O.fuel)),
    fuelMax: round(f(O.fuelCapacity)),
    fuelRange: round(f(O.fuelRange)),
    fuelWarn: flag(O.fuelWarning),
    adblue: round(f(O.adblue)),
    // the game gives pressures in psi and consumption in litres per km
    airPressure: round(f(O.airPressure) * 0.0689476, 1),
    oilPressure: round(f(O.oilPressure) * 0.0689476, 1),
    brakeTemp: round(f(O.brakeTemperature)),
    battery: round(f(O.batteryVoltage), 1),
    fuelAvg: round(f(O.fuelAvgConsumption) * 100, 1),
    odometer: round(f(O.odometer)),
    waterTemp: round(f(O.waterTemperature)),
    oilTemp: round(f(O.oilTemperature)),
    airWarn: flag(O.airPressureWarning),
    handbrake: flag(O.parkBrake),
    engineBrake: flag(O.motorBrake),
    retarder: b.readUInt32LE(O.retarderBrake),
    retarderMax: b.readUInt32LE(O.retarderStepCount),
    blinkL: flag(O.blinkerLeftOn),
    blinkR: flag(O.blinkerRightOn),
    hazard: flag(O.lightsHazard),
    parkLights: flag(O.lightsParking),
    lowBeam: flag(O.lightsBeamLow),
    highBeam: flag(O.lightsBeamHigh),
    beacon: flag(O.lightsBeacon),
    wipers: flag(O.wipers),
    trailer: flag(O.trailerAttached),
    truckDamage: round(wear, 3),
    cargoDamage: round(f(O.cargoDamage), 3),
    onJob,
    cargo: onJob ? cstr(b, O.cargo, 64) : '',
    origin: onJob ? cstr(b, O.citySrc, 64) : '',
    destination: onJob ? cstr(b, O.cityDst, 64) : '',
    jobDistance: onJob ? b.readUInt32LE(O.plannedDistanceKm) : null,
    income: onJob ? Number(b.readBigUInt64LE(O.jobIncome)) : null,
    deadline: onJob && delivery && tabs && delivery < 0xfffffff0 ? fmtDuration(delivery - tabs) : '',
    restStop: tabs ? fmtDuration(rest) : '',
    gameClock: tabs ? `${DAYS[Math.floor(tabs / 1440) % 7]} ${String(Math.floor((tabs % 1440) / 60)).padStart(2, '0')}:${String(tabs % 60).padStart(2, '0')}` : ''
  }
  return frame
}

export class ScsSource implements Source {
  id = 'ets2'
  private map: SharedMemory | null = null
  private nextOpen = 0
  private render = -1n
  private renderAt = 0
  private live = false

  poll(now: number): Frame | null {
    if (!this.map) {
      if (now < this.nextOpen) return null
      this.nextOpen = now + 2000
      this.map = SharedMemory.open('Local\\SCSTelemetry', MAP_SIZE)
      if (!this.map) return null
      this.renderAt = now
    }
    const b = this.map.buf
    // renderTime advances on every rendered frame, paused or not. If it stops, the game is gone
    // and only our handle keeps the mapping alive: let it go.
    const render = b.readBigUInt64LE(O.renderTime)
    if (render !== this.render) {
      this.render = render
      this.renderAt = now
    } else if (now - this.renderAt > STALE_MS) {
      this.map.close()
      this.map = null
      this.live = false
      return null
    }
    const frame = decodeScs(b)
    this.live = !!frame
    return frame
  }

  status(): SourceStatus {
    return { id: this.id, state: this.live ? 'on' : 'off' }
  }

  stop() {
    this.map?.close()
    this.map = null
  }
}
