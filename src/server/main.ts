// PitGlass: start the telemetry hub and the dashboard server.
//   node src/server/main.ts [--demo car|truck|plane] [--port 47830] [--open]
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DRIVE_PORT, PORT } from '../shared/types.ts'
import { Apps } from './apps.ts'
import { Hub } from './hub.ts'
import { Server, lanAddresses } from './server.ts'
import { AcSource } from './sources/ac.ts'
import { DemoSource, type DemoKind } from './sources/demo.ts'
import { ScsSource } from './sources/ets2.ts'
import { MsfsSource } from './sources/msfs.ts'
import { UdpSource, decodeDrive, decodeMotorTown, decodeOutGauge } from './sources/udp.ts'
import { Store } from './store.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? (process.argv[i + 1] ?? '') : null
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const webDir = path.join(root, 'dist', 'web')
if (!fs.existsSync(path.join(webDir, 'index.html'))) {
  console.error('The dashboard page is not built yet. Run: npm run build')
  process.exit(1)
}

const store = new Store()
// --demo is for this run only: it does not change the saved setting
const demoArg = arg('demo')
const demo = (): DemoKind => (demoArg && ['car', 'truck', 'plane'].includes(demoArg) ? (demoArg as DemoKind) : store.config.demo)

const msfs = new MsfsSource(() => store.config.simconnectDll)
const hub = new Hub(
  [
    new DemoSource(demo),
    new AcSource(),
    new ScsSource(),
    msfs,
    new UdpSource('beamng', 4444, decodeOutGauge),
    new UdpSource('motortown', 33330, (p) => decodeMotorTown(p), 3000)
  ],
  new UdpSource('wheel', DRIVE_PORT, decodeDrive, 1500)
)
const apps = new Apps()
const port = Number(arg('port')) || PORT
const server = new Server({ hub, store, apps, msfs, webDir, version: pkg.version, port })

// New best lap: the LED strip flashes purple (Ambibox LED), if the user wants it.
let best = 0
let armed = false
hub.on('game', () => {
  best = typeof hub.frame.bestMs === 'number' ? hub.frame.bestMs : 0
  armed = hub.game !== null && demo() === 'off'
})
hub.on('diff', (d) => {
  if (typeof d.bestMs !== 'number') return
  const improved = armed && d.bestMs > 0 && (best <= 0 || d.bestMs < best)
  best = d.bestMs
  if (improved && store.config.bestLapFlash) apps.flash([168, 85, 247], 'pitglass-bestlap')
})

try {
  await server.listen()
} catch (e) {
  const code = (e as NodeJS.ErrnoException).code
  console.error(code === 'EADDRINUSE' ? `Port ${port} is already in use: PitGlass is probably open already (http://localhost:${port}).` : String(e))
  process.exit(1)
}
hub.start()
apps.start()

const local = `http://localhost:${port}`
console.log(`PitGlass ${pkg.version}`)
console.log(`  On this PC:    ${local}`)
console.log(lanAddresses().length ? `  On the phone:  ${server.phoneUrl()}` : '  No local network address found: connect the PC to your Wi-Fi or router.')
if (demo() !== 'off') console.log(`  Demo telemetry: ${demo()}`)
if (process.argv.includes('--open') && process.platform === 'win32') execFile('cmd', ['/c', 'start', '', local])

const quit = () => {
  hub.stop()
  apps.stop()
  server.close()
  process.exit(0)
}
process.on('SIGINT', quit)
process.on('SIGTERM', quit)
