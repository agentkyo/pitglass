// HTTP + WebSocket server: serves the dashboard page, streams telemetry and stores layouts.
//
// Who may talk to it:
//   - this PC (loopback): everything, as long as the Host header really is localhost (a web page
//     cannot reach it through DNS rebinding) and writes come from the page itself;
//   - the local network: only with the pairing key that the QR code carries.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import QRCode from 'qrcode'
import { WebSocketServer, type WebSocket } from 'ws'
import type { ServerMsg, State } from '../shared/types.ts'
import type { Apps } from './apps.ts'
import type { Hub } from './hub.ts'
import { capture, desktop } from './screen.ts'
import type { MsfsSource } from './sources/msfs.ts'
import type { Store } from './store.ts'
import type { Trail } from './trail.ts'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
}

const isLoopback = (addr = '') => addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'

/** IPv4 addresses of this PC on the local network, private ranges first. */
export function lanAddresses(): string[] {
  const out: string[] = []
  for (const list of Object.values(os.networkInterfaces())) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push(a.address)
  const priv = (a: string) => (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a) ? 0 : 1)
  return out.sort((a, b) => priv(a) - priv(b))
}

export interface Deps {
  hub: Hub
  store: Store
  apps: Apps
  msfs: MsfsSource
  trail: Trail
  webDir: string
  version: string
  port: number
}

export class Server {
  private http: http.Server
  private wss: WebSocketServer
  private screens = new Set<WebSocket & { local?: boolean; lag?: boolean }>()
  private qr = ''
  private qrFor = ''
  private shot: { at: number; key: string; data: Buffer; type: string } | null = null

  private d: Deps

  constructor(d: Deps) {
    this.d = d
    this.http = http.createServer((req, res) => void this.handle(req, res).catch(() => this.json(res, 500, { error: 'internal error' })))
    this.wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })
    this.http.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '/', 'http://x')
      if (url.pathname !== '/ws' || !this.allowed(req, url)) return socket.destroy()
      this.wss.handleUpgrade(req, socket, head, (ws) => this.accept(ws, isLoopback(req.socket.remoteAddress)))
    })
    d.hub.on('game', () => {
      this.broadcast({ t: 'full', game: d.hub.game, d: d.hub.frame })
      void this.pushState()
    })
    d.hub.on('diff', (diff) => this.broadcast({ t: 'diff', d: diff }, true))
    d.apps.onChange = () => void this.pushState()
  }

  listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.once('error', reject)
      this.http.listen(this.d.port, '0.0.0.0', () => resolve())
    })
  }

  close() {
    for (const ws of this.screens) ws.terminate()
    this.http.close()
  }

  phoneUrl(): string {
    return `http://${lanAddresses()[0] ?? '127.0.0.1'}:${this.d.port}/?k=${this.d.store.key}`
  }

  // ------------------------------------------------------------------ access
  private allowed(req: http.IncomingMessage, url: URL): boolean {
    const host = (req.headers.host ?? '').toLowerCase()
    if (isLoopback(req.socket.remoteAddress)) return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
    const key = url.searchParams.get('k') ?? String(req.headers['x-pitglass-key'] ?? '')
    return key.length > 0 && key === this.d.store.key
  }

  /** A write must come from our own page (or from a script, which sends no Origin). */
  private sameOrigin(req: http.IncomingMessage): boolean {
    const origin = req.headers.origin
    return !origin || origin === `http://${req.headers.host}`
  }

  // ------------------------------------------------------------------ screens
  private accept(ws: WebSocket & { local?: boolean; lag?: boolean }, local: boolean) {
    ws.local = local
    this.screens.add(ws)
    ws.on('close', () => {
      this.screens.delete(ws)
      void this.pushState()
    })
    ws.on('error', () => ws.terminate())
    void this.state(local).then((state) => {
      this.send(ws, { t: 'state', state })
      this.send(ws, { t: 'full', game: this.d.hub.game, d: this.d.hub.frame })
    })
    void this.pushState()
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
  }

  /** `droppable` messages are skipped for a screen that is not keeping up; it gets a full frame later. */
  private broadcast(msg: ServerMsg, droppable = false) {
    if (!this.screens.size) return
    const raw = JSON.stringify(msg)
    for (const ws of this.screens) {
      if (ws.readyState !== ws.OPEN) continue
      if (droppable && ws.bufferedAmount > 64_000) {
        ws.lag = true
        continue
      }
      if (ws.lag) {
        ws.lag = false
        ws.send(JSON.stringify({ t: 'full', game: this.d.hub.game, d: this.d.hub.frame }))
        if (droppable) continue
      }
      ws.send(raw)
    }
  }

  async state(local: boolean): Promise<State> {
    const s: State = {
      version: this.d.version, game: this.d.hub.game, sources: this.d.hub.status(), apps: this.d.apps.links,
      config: this.d.store.config, screens: this.screens.size
    }
    if (local) {
      s.phoneUrl = this.phoneUrl()
      if (this.qrFor !== s.phoneUrl) {
        this.qr = await QRCode.toString(s.phoneUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
        this.qrFor = s.phoneUrl
      }
      s.qr = this.qr
    }
    return s
  }

  async pushState() {
    for (const ws of this.screens) this.send(ws, { t: 'state', state: await this.state(!!ws.local) })
  }

  // ------------------------------------------------------------------ http
  private json(res: http.ServerResponse, code: number, body: unknown) {
    if (res.headersSent) return
    res.writeHead(code, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }

  private image(res: http.ServerResponse, data: Buffer, type: string) {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(data)
  }

  private body(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let raw = ''
      req.setEncoding('utf8')
      req.on('data', (c) => {
        raw += c
        if (raw.length > 600_000) reject(new Error('too large'))
      })
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch {
          reject(new Error('bad json'))
        }
      })
      req.on('error', reject)
    })
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://x')
    const p = url.pathname
    if (!p.startsWith('/api/')) return this.file(req, res, p)
    if (!this.allowed(req, url)) return this.json(res, 403, { error: 'pairing key required: open the address shown by PitGlass on the PC' })
    const local = isLoopback(req.socket.remoteAddress)
    const { hub, store, apps } = this.d

    if (req.method === 'GET') {
      if (p === '/api/state') return this.json(res, 200, await this.state(local))
      if (p === '/api/layouts') return this.json(res, 200, store.layouts())
      if (p === '/api/telemetry') return this.json(res, 200, { game: hub.game, data: hub.frame })
      // the mirrored piece of the screen, for paired screens; a frame is reused for a moment so several screens cost one capture
      if (p === '/api/mirror') {
        const m = store.config.mirror
        if (!m) return this.json(res, 404, { error: 'no screen area chosen: pick one in the control panel on the PC' })
        const key = `${m.x},${m.y},${m.w},${m.h}`
        if (!this.shot || this.shot.key !== key || Date.now() - this.shot.at > 70) {
          const c = capture(m, 900)
          if (!c) return this.json(res, 503, { error: 'the screen could not be captured' })
          this.shot = { at: Date.now(), key, data: c.data, type: c.type }
        }
        return this.image(res, this.shot.data, this.shot.type)
      }
      // the whole desktop, or any piece of it: only for the PC itself, to choose the area
      if (p === '/api/desktop' && local) return this.json(res, 200, desktop() ?? { x: 0, y: 0, w: 0, h: 0 })
      if (p === '/api/desktop.jpg' && local) {
        const d = desktop()
        const q = (k: string) => Math.round(Number(url.searchParams.get(k)))
        const c = d && capture(url.searchParams.has('w') ? { x: q('x'), y: q('y'), w: q('w'), h: q('h') } : d, 1920)
        return c ? this.image(res, c.data, c.type) : this.json(res, 503, { error: 'the screen could not be captured' })
      }
      if (p === '/api/trail') return this.json(res, 200, this.d.trail.data())
      if (p === '/api/trackmap.png') {
        const img = this.d.trail.image
        if (!img) return this.json(res, 404, { error: 'no track picture for this game' })
        res.writeHead(200, { 'Content-Type': MIME['.png'], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        return void fs.createReadStream(img.file).on('error', () => res.destroy()).pipe(res)
      }
      return this.json(res, 404, { error: 'use /api/state, /api/layouts, /api/telemetry or /api/trail' })
    }
    if (!this.sameOrigin(req)) return this.json(res, 403, { error: 'cross-site request refused' })
    // a paired screen may press dashboard buttons; layouts and settings change only on the PC itself
    if (!local && p !== '/api/action') return this.json(res, 403, { error: 'only the PC running PitGlass can change layouts and settings' })
    try {
      if (req.method === 'POST' && p === '/api/config') {
        store.setConfig(await this.body(req))
        await this.pushState()
        return this.json(res, 200, store.config)
      }
      if (req.method === 'PUT' && p === '/api/layouts') {
        const l = store.put(await this.body(req))
        this.broadcast({ t: 'layouts' })
        return this.json(res, 200, l)
      }
      if (req.method === 'DELETE' && p.startsWith('/api/layouts/')) {
        const ok = store.remove(decodeURIComponent(p.slice('/api/layouts/'.length)))
        if (ok) this.broadcast({ t: 'layouts' })
        return this.json(res, ok ? 200 : 404, { ok })
      }
      if (req.method === 'POST' && p === '/api/action') {
        const b = await this.body(req)
        const app = String(b.app ?? '')
        const action = String(b.action ?? '')
        const arg = String(b.arg ?? '')
        const ok = app === 'msfs' ? action === 'event' && this.d.msfs.send(arg) : await apps.act(app, action, arg)
        if (app !== 'msfs') void apps.poll()
        return this.json(res, ok ? 200 : 400, { ok })
      }
    } catch (e) {
      return this.json(res, 400, { error: e instanceof Error ? e.message : 'bad request' })
    }
    return this.json(res, 404, { error: 'not found' })
  }

  private file(req: http.IncomingMessage, res: http.ServerResponse, p: string) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return this.json(res, 405, { error: 'GET only' })
    const rel = p === '/' ? 'index.html' : p.slice(1)
    const full = path.resolve(this.d.webDir, rel)
    if (!full.startsWith(path.resolve(this.d.webDir) + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) return this.json(res, 404, { error: 'not found' })
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    })
    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(full).pipe(res)
  }
}
