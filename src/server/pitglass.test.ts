import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { CHANNEL, derive, fmtDuration, fmtLap, type Frame } from '../shared/channels.ts'
import { BUILTIN, DEFAULT_LAYOUT } from '../shared/layouts.ts'
import { WIDGET, niceStep } from '../../web/src/widgets.ts'
import { Hub, diff } from './hub.ts'
import { decodeAc } from './sources/ac.ts'
import { decodeScs, fmtGear } from './sources/ets2.ts'
import type { Source } from './sources/source.ts'
import dgram from 'node:dgram'
import { scsToLatLon } from './sources/scsmap.ts'
import { UdpSource, decodeDrive, decodeMotorTown, decodeOutGauge, outGaugeGear } from './sources/udp.ts'
import { Trail, readTrackImage, safeName } from './trail.ts'
import { Store, cleanLayout } from './store.ts'

test('formatters', () => {
  assert.equal(fmtLap(98412), '1:38.412')
  assert.equal(fmtLap(0), '-:--.---')
  assert.equal(fmtDuration(365), '6h05')
  assert.equal(fmtDuration(-12), '-0h12')
  assert.equal(fmtGear(0), 'N')
  assert.equal(fmtGear(12), '12')
  assert.equal(fmtGear(-1), 'R')
  assert.equal(fmtGear(-2), 'R2')
  assert.equal(outGaugeGear(0), 'R')
  assert.equal(outGaugeGear(1), 'N')
  assert.equal(outGaugeGear(4), '3')
})

test('derive fills the values every game shares', () => {
  const f = derive({ rpm: 8000, rpmMax: 8500, fuel: 30, fuelMax: 120, speed: 95, speedLimit: 90 })
  assert.equal(f.fuelPct, 0.25)
  assert.equal(f.shiftLight, true)
  assert.equal(f.overLimit, true)
  assert.equal(derive({ speed: 92, speedLimit: 90 }).overLimit, false)
  assert.equal(derive({ rpm: 1, fuelPct: 0.5 }).fuelPct, 0.5)
})

test('Assetto Corsa shared memory', () => {
  const ph = Buffer.alloc(800)
  const gf = Buffer.alloc(1600)
  const st = Buffer.alloc(820)
  assert.equal(decodeAc(ph, gf, st), null, 'status 0 = no session')
  gf.writeInt32LE(2, 4)
  st.writeInt32LE(8500, 412)
  st.writeFloatLE(120, 416)
  st.write('ks_porsche_911', 68, 'utf16le')
  st.write('imola', 134, 'utf16le')
  ph.writeFloatLE(0.75, 4)
  ph.writeFloatLE(41.25, 12)
  ph.writeInt32LE(4, 16)
  ph.writeInt32LE(7200, 20)
  ph.writeFloatLE(187.4, 28)
  ph.writeFloatLE(92.6, 156)
  ph.writeFloatLE(0.565, 564)
  gf.writeInt32LE(4, 132)
  gf.writeInt32LE(3, 136)
  gf.writeInt32LE(98412, 148)
  const f = decodeAc(ph, gf, st)!
  assert.equal(f.game, 'ac')
  assert.equal(f.vehicle, 'ks_porsche_911')
  assert.equal(f.track, 'imola')
  assert.equal(f.gear, '3')
  assert.equal(f.rpm, 7200)
  assert.equal(f.speed, 187)
  assert.equal(f.throttle, 0.75)
  assert.equal(f.tyreFR, 93)
  assert.equal(f.brakeBias, 56.5)
  assert.equal(f.lap, 5)
  assert.equal(f.position, 3)
  assert.equal(f.lapBest, '1:38.412')
  ph.writeInt32LE(0, 16)
  assert.equal(decodeAc(ph, gf, st)!.gear, 'R')
})

test('ETS2 / ATS telemetry plugin memory', () => {
  const b = Buffer.alloc(21600)
  assert.equal(decodeScs(b), null, 'sdk not active')
  b[0] = 1
  b.writeUInt32LE(2, 52)
  b.writeUInt32LE(10000, 64) // game minutes
  b.writeUInt32LE(10410, 88) // delivery deadline
  b.writeUInt32LE(352, 100)
  b.writeInt32LE(365, 500)
  b.writeInt32LE(-1, 508)
  b.writeFloatLE(900, 704)
  b.writeFloatLE(2500, 740)
  b.writeFloatLE(-5, 948) // reversing at 18 km/h
  b.writeFloatLE(1180, 952)
  b.writeFloatLE(0.4, 960)
  b.writeFloatLE(80 / 3.6, 988)
  b.writeFloatLE(612, 1000)
  b.writeFloatLE(86, 1024)
  b.writeFloatLE(0.12, 1048)
  b.writeFloatLE(90 / 3.6, 1068)
  b[1566] = 1
  b[1580] = 1
  b[1589] = 1
  b.write('Scania', 2364)
  b.write('S', 2492)
  b.write('Tractors', 2620)
  b.write('Praha', 2748)
  b[4300] = 1
  b[6080] = 1
  const f = decodeScs(b)!
  assert.equal(f.game, 'ats')
  assert.equal(f.vehicle, 'Scania S')
  assert.equal(f.speed, 18)
  assert.equal(f.gear, 'R')
  assert.equal(f.rpmMax, 2500)
  assert.ok(Math.abs((f.throttle as number) - 0.4) < 1e-6)
  assert.equal(f.cruise, 80)
  assert.equal(f.cruiseOn, true)
  assert.equal(f.speedLimit, 90)
  assert.equal(f.fuel, 612)
  assert.equal(f.waterTemp, 86)
  assert.equal(f.truckDamage, 0.12)
  assert.equal(f.handbrake, true)
  assert.equal(f.blinkL, true)
  assert.equal(f.blinkR, false)
  assert.equal(f.cargo, 'Tractors')
  assert.equal(f.destination, 'Praha')
  assert.equal(f.jobDistance, 352)
  assert.equal(f.deadline, '6h50')
  assert.equal(f.restStop, '6h05')
  assert.equal(f.gameClock, 'Sun 22:40') // minute 10000 = day 6 (Monday is 0)
  assert.equal(f.trailer, true)
})

test('BeamNG OutGauge packet', () => {
  const p = Buffer.alloc(96)
  assert.equal(decodeOutGauge(Buffer.alloc(40)), null)
  p.writeInt8(3, 10)
  p.writeFloatLE(25, 12)
  p.writeFloatLE(4321, 16)
  p.writeFloatLE(0.62, 28)
  p.writeUInt32LE((1 << 5) | (1 << 6) | (1 << 2) | (1 << 10), 44)
  p.writeFloatLE(1, 48)
  const f = decodeOutGauge(p)!
  assert.equal(f.gear, '2')
  assert.equal(f.speed, 90)
  assert.equal(f.rpm, 4321)
  assert.equal(f.hazard, true)
  assert.equal(f.handbrake, true)
  assert.equal(f.abs, true)
  assert.equal(f.highBeam, false)
})

test('Motor Town packet', () => {
  const p = Buffer.alloc(849)
  p.write('MTTM', 0, 'latin1')
  p[4] = 1
  p.writeUInt16LE(841, 6)
  p.writeFloatLE(1700, 108)
  p.writeFloatLE(2600, 112)
  p.writeInt32LE(5, 116)
  p.writeFloatLE(72, 124)
  p.writeUInt32LE(0x02 | 0x08 | 0x40, 145)
  p.writeFloatLE(0.64, 149)
  p[158] = 1
  p.writeFloatLE(80, 230)
  p.write('Demo truck', 753)
  const f = decodeMotorTown(p, 0)!
  assert.equal(f.gear, '5')
  assert.equal(f.speed, 72)
  assert.equal(f.lowBeam, true)
  assert.equal(f.cruiseOn, true)
  assert.equal(f.blinkL, true)
  assert.equal(decodeMotorTown(p, 360)!.blinkL, false, 'the lamp blinks')
  assert.equal(f.speedLimit, 80)
  assert.equal(f.vehicle, 'Demo truck')
  assert.equal(decodeMotorTown(p.subarray(0, 800)), null, 'size must match the header')
  p[4] = 2
  assert.equal(decodeMotorTown(p), null, 'unknown major version')
})

test('drive feed (MyWheel format)', () => {
  const f = decodeDrive(Buffer.from(JSON.stringify({ steer: -0.5, throttle: 0.8, brake: 2, clutch: 0, gear: '3' })))!
  assert.deepEqual(f, { game: 'wheel', steer: -0.5, throttle: 0.8, brake: 1, clutch: 0, gear: '3' })
  assert.equal(decodeDrive(Buffer.from('not json')), null)
  assert.equal(decodeDrive(Buffer.from('{"cmd":"status"}')), null)
})

const fake = (id: string, frame: () => Frame | null): Source => ({ id, poll: frame, status: () => ({ id, state: 'off' }), stop() {} })

test('hub: first live game wins, diffs carry only what changed', () => {
  assert.deepEqual(diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), { b: 3, c: 4 })
  assert.deepEqual(diff({ a: 1, gone: 2 }, { a: 1 }), { gone: null })
  assert.equal(diff({ a: 1 }, { a: 1 }), null)

  let truck: Frame | null = null
  let speed = 100
  const hub = new Hub([fake('truck', () => truck), fake('car', () => ({ game: 'ac', speed, rpm: 4000, rpmMax: 8000 }))], fake('wheel', () => ({ game: 'wheel', steer: 0.3, throttle: 0.1 })))
  const games: (string | null)[] = []
  const diffs: Frame[] = []
  hub.on('game', (g) => games.push(g))
  hub.on('diff', (d) => diffs.push(d))
  hub.tick(1)
  assert.deepEqual(games, ['ac'])
  assert.equal(hub.frame.rpmPct, 0.5)
  assert.equal(hub.frame.steer, 0.3, 'the wheel fills what the game does not send')
  speed = 120
  hub.tick(2)
  assert.deepEqual(diffs, [{ speed: 120 }])
  truck = { game: 'ets2', speed: 80 }
  hub.tick(3)
  assert.deepEqual(games, ['ac', 'ets2'])
  assert.equal(hub.frame.speed, 80)
})

test('hub: with no game, wheel inputs alone make a frame', () => {
  const hub = new Hub([fake('none', () => null)], fake('wheel', () => ({ game: 'wheel', throttle: 0.5 })))
  hub.tick(1)
  assert.equal(hub.game, 'wheel')
  const idle = new Hub([fake('none', () => null)])
  idle.tick(1)
  assert.equal(idle.game, null)
})

test('built-in layouts are valid and only use known widgets and channels', () => {
  const ids = new Set<string>()
  for (const l of BUILTIN) {
    assert.ok(!ids.has(l.id), `duplicate id ${l.id}`)
    ids.add(l.id)
    const clean = cleanLayout(JSON.parse(JSON.stringify(l)))
    assert.equal(clean.pages.length, l.pages.length)
    for (const p of l.pages) {
      const cells = new Set<string>()
      for (const w of p.widgets) {
        assert.ok(WIDGET[w.type], `${l.id}: unknown widget ${w.type}`)
        if (w.ch) assert.ok(CHANNEL[w.ch], `${l.id}: unknown channel ${w.ch}`)
        if (typeof w.p?.warn === 'string') assert.ok(CHANNEL[w.p.warn], `${l.id}: unknown channel ${w.p.warn}`)
        assert.ok(w.x >= 0 && w.y >= 0 && w.x + w.w <= l.cols && w.y + w.h <= l.rows, `${l.id}/${p.name}: ${w.type} at ${w.x},${w.y} is off the grid`)
        // a widget without a panel may sit on top of another one (the gear inside a tachometer)
        if (w.p?.uiBare === true) continue
        for (let x = w.x; x < w.x + w.w; x++)
          for (let y = w.y; y < w.y + w.h; y++) {
            assert.ok(!cells.has(`${x},${y}`), `${l.id}/${p.name}: widgets overlap at ${x},${y}`)
            cells.add(`${x},${y}`)
          }
      }
    }
  }
  for (const id of Object.values(DEFAULT_LAYOUT)) assert.ok(ids.has(id), `default layout ${id} does not exist`)
  assert.ok(ids.has('idle'))
})

test('layouts from outside are checked', () => {
  const ok = JSON.parse(JSON.stringify(BUILTIN[0]))
  ok.id = 'mine'
  assert.throws(() => cleanLayout({ ...ok, id: '../evil' }))
  assert.throws(() => cleanLayout({ ...ok, cols: 9999 }))
  assert.throws(() => cleanLayout({ ...ok, pages: [] }))
  assert.throws(() => cleanLayout(null))
  const odd = cleanLayout({ ...ok, theme: { bg: 'url(javascript:1)', accent: '#abc' }, kind: 'boat' })
  assert.equal(odd.theme.bg, '#05070a')
  assert.equal(odd.theme.accent, '#abc')
  assert.equal(odd.kind, 'any')
  const styled = cleanLayout({ ...ok, theme: { ...ok.theme, font: 'serif', style: 'bezel' } })
  assert.equal(styled.theme.font, 'serif')
  assert.equal(styled.theme.style, 'bezel')
  const noted = cleanLayout({ ...ok, note: 'n'.repeat(500) })
  assert.equal(noted.note?.length, 120)
  const junk = cleanLayout({ ...ok, theme: { ...ok.theme, font: 'x; background:url(evil)', style: 'flat' } })
  assert.equal(junk.theme.font, undefined)
  assert.equal(junk.theme.style, undefined)
})

test('dial scales pick round steps', () => {
  assert.equal(niceStep(300, 10), 50) // km/h
  assert.equal(niceStep(8500, 10), 1000) // rpm
  assert.equal(niceStep(2500, 10), 500) // truck rpm
  assert.equal(niceStep(140, 10), 20)
  assert.equal(niceStep(4000, 7), 1000) // vertical speed, -2000 to 2000
  assert.ok(Math.abs(niceStep(2, 10) - 0.2) < 1e-9) // boost in bar
})

test('store keeps user layouts and settings, and protects the built-in ones', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitglass-'))
  try {
    const a = new Store(dir)
    assert.match(a.key, /^[A-Za-z0-9_-]{16,}$/)
    const mine = JSON.parse(JSON.stringify(BUILTIN[0]))
    assert.throws(() => a.put(mine), /read-only/)
    mine.id = 'my-race'
    mine.name = 'My race'
    a.put(mine)
    a.setConfig({ units: 'imperial', assign: { ac: 'my-race', 'bad game': 'x' }, demo: 'nope' as never })
    const b = new Store(dir)
    assert.equal(b.key, a.key)
    assert.equal(b.config.units, 'imperial')
    assert.deepEqual(b.config.assign, { ac: 'my-race' })
    assert.equal(b.config.demo, 'off')
    assert.equal(b.layouts().find((l) => l.id === 'my-race')?.name, 'My race')
    assert.equal(b.remove('my-race'), true)
    assert.equal(b.remove('race-gt'), false)
    assert.equal(new Store(dir).layouts().length, BUILTIN.length)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('two apps share one game port: the late one reads the repeated feed', async () => {
  const port = 47000 + Math.floor(Math.random() * 400) * 2
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const first = new UdpSource('a', port, decodeDrive, 2500, port + 1)
  await wait(150)
  const late = new UdpSource('b', port, decodeDrive, 2500, port + 1)
  const game = dgram.createSocket('udp4')
  try {
    await wait(250)
    assert.equal(late.status().state, 'off', 'a taken port is not an error while the feed is shared')
    game.send(JSON.stringify({ steer: 0.25, throttle: 1 }), port, '127.0.0.1')
    await wait(250)
    assert.equal(first.poll(Date.now())?.steer, 0.25)
    assert.equal(late.poll(Date.now())?.steer, 0.25)
  } finally {
    first.stop()
    late.stop()
    game.close()
  }
})

test('truck world position lands on the real map', () => {
  const near = (got: [number, number], lat: number, lon: number, tol: number) => assert.ok(Math.abs(got[0] - lat) < tol && Math.abs(got[1] - lon) < tol, `${got} is not near ${lat}, ${lon}`)
  near(scsToLatLon('ets2', 16660, 4150), 50, 15, 1e-6) // the projection's own origin
  near(scsToLatLon('ats', 0, 0), 39, -96, 1e-6)
  near(scsToLatLon('ets2', 0, 0), 50.6, 10.3, 0.2) // central Germany
  near(scsToLatLon('ets2', -40000, -12000), 51.5, -0.6, 0.5) // Great Britain has its own scale: west of London
  const f = decodeScs(scsBuffer())!
  assert.equal(f.heading, 90, 'the game counts counterclockwise: three quarters of a turn is east')
  assert.equal(f.navDistance, 152)
  assert.equal(f.navTime, '2h05')
  assert.ok(typeof f.lat === 'number' && typeof f.lon === 'number')
})

function scsBuffer(): Buffer {
  const b = Buffer.alloc(21600)
  b[0] = 1
  b.writeDoubleLE(1200.5, 2200)
  b.writeDoubleLE(-3400, 2216)
  b.writeDoubleLE(0.75, 2224)
  b.writeFloatLE(152_000, 1060)
  b.writeFloatLE(7500, 1064)
  return b
}

test('trail: thins the path, breaks it on a teleport, starts over on another track', () => {
  const t = new Trail()
  for (let i = 0; i <= 100; i++) t.feed('ac', { track: 'imola', posX: i, posZ: 0 })
  let d = t.data()
  assert.equal(d.segs.length, 1)
  assert.equal(d.segs[0].length / 2, 34, 'one point every 3 m')
  t.feed('ac', { track: 'imola', posX: 5000, posZ: 0 })
  assert.equal(t.data().segs.length, 2)
  t.feed('ac', { track: 'spa', posX: 1, posZ: 1 })
  d = t.data()
  assert.equal(d.key, 'ac|spa|')
  assert.deepEqual(d.segs, [[1, 1]])
  for (let i = 0; i < 20000; i++) t.feed('ac', { track: 'spa', posX: i * 3, posZ: 0 })
  d = t.data()
  assert.ok(d.step > 3 && d.segs.reduce((n, s) => n + s.length / 2, 0) <= 4001, 'a long drive stays small')
  assert.equal(safeName('ks_nordschleife'), 'ks_nordschleife')
  assert.equal(safeName('..\\..\\windows'), '')
  assert.equal(safeName('a/b'), '')
})

test('track drawing of Assetto Corsa: map.png + data/map.ini', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitglass-track-'))
  try {
    assert.equal(readTrackImage(dir), null)
    const png = Buffer.alloc(24)
    png.write('\x89PNG\r\n\x1a\n', 0, 'latin1')
    png.writeUInt32BE(1543, 16)
    png.writeUInt32BE(872, 20)
    fs.writeFileSync(path.join(dir, 'map.png'), png)
    fs.mkdirSync(path.join(dir, 'data'))
    fs.writeFileSync(path.join(dir, 'data', 'map.ini'), '[PARAMETERS]\nWIDTH=1543.89\nSCALE_FACTOR=1.2\nX_OFFSET=955.115\nZ_OFFSET=536.043\n')
    assert.deepEqual(readTrackImage(dir), { file: path.join(dir, 'map.png'), scale: 1.2, x0: -955.115, z0: -536.043, w: 1543, h: 872 })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
