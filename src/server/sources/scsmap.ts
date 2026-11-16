// Where a truck is on the real map. ETS2 and ATS worlds are a Lambert conformal conic projection of
// Europe / North America at about 1:19 (the parameters come from the games' def/climate.sii, as
// documented by the truckermudgeon/maps project). Good enough to show the right region and city
// on a real map; roads do not line up, the game world is a compressed version of the real one.
const RAD = Math.PI / 180

interface Proj {
  lat1: number
  lat2: number
  lat0: number
  lon0: number
  /** game units -> degrees: [for z, for x] */
  factor: [number, number]
  offset: [number, number]
}

const ETS2: Proj = { lat1: 37, lat2: 65, lat0: 50, lon0: 15, factor: [-0.000171570875, 0.0001729241463], offset: [16660, 4150] }
const ATS: Proj = { lat1: 33, lat2: 45, lat0: 39, lon0: -96, factor: [-0.00017706234, 0.000176689948], offset: [0, 0] }

const tanHalf = (lat: number) => Math.tan(Math.PI / 4 + (lat * RAD) / 2)

/** Inverse Lambert conformal conic on a unit sphere; x and y in radians of arc. */
function inverse(p: Proj, x: number, y: number): [number, number] {
  const n = Math.log(Math.cos(p.lat1 * RAD) / Math.cos(p.lat2 * RAD)) / Math.log(tanHalf(p.lat2) / tanHalf(p.lat1))
  const F = (Math.cos(p.lat1 * RAD) * Math.pow(tanHalf(p.lat1), n)) / n
  const rho0 = F / Math.pow(tanHalf(p.lat0), n)
  const rho = Math.sign(n) * Math.hypot(x, rho0 - y)
  const theta = Math.atan2(x, rho0 - y)
  return [(2 * Math.atan(Math.pow(F / rho, 1 / n)) - Math.PI / 2) / RAD, p.lon0 + theta / n / RAD]
}

/** Game world position (x east, z south, metres) -> [latitude, longitude]. */
export function scsToLatLon(game: 'ets2' | 'ats', x: number, z: number): [number, number] {
  const p = game === 'ats' ? ATS : ETS2
  let px = x - p.offset[0]
  let pz = z - p.offset[1]
  if (game === 'ets2') {
    // Great Britain was drawn at another scale; its sectors are west and north of Calais
    const sx = Math.floor(x / 4000)
    const sz = Math.floor(z / 4000)
    if (sx <= -8 && sz <= -2 && !(sx === -8 && sz === -2)) {
      px = (px - 31100 / 2) * 0.75
      pz = (pz - 5500 / 2) * 0.75
    }
  }
  return inverse(p, px * p.factor[1] * RAD, pz * p.factor[0] * RAD)
}
