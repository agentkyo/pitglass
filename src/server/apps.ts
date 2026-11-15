// Optional links to the sibling apps, each through its own local channel. PitGlass works the same
// without any of them, and they without PitGlass.
//   FreeDock    (MiraBox N4 deck)      HTTP 127.0.0.1:47810  /info /page /notify
//   Ambibox LED (LED strip)            UDP  127.0.0.1:47811  JSON {cmd: status|fx|layer}
//   IAmPcGamer  (game brain, overlays) HTTP 127.0.0.1:47820  /status /capture /overlay /tip
//   MyWheel     (wheel mapping)        seen through IAmPcGamer; its drive feed can be sent to UDP 47831
// Their HTTP APIs refuse requests that come from web pages, so the phone asks PitGlass and
// PitGlass asks them: only the actions listed in `act` exist.
import dgram from 'node:dgram'
import http from 'node:http'
import type { AppLink } from '../shared/types.ts'

const FREEDOCK = 47810
const AMBIBOX = 47811
const IAMPCGAMER = 47820

function get(port: number, pathname: string): Promise<{ code: number; body: any } | null> {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: pathname, timeout: 1500 }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (c) => (raw.length < 200_000 ? (raw += c) : null))
      res.on('end', () => {
        try {
          resolve({ code: res.statusCode ?? 0, body: JSON.parse(raw) })
        } catch {
          resolve({ code: res.statusCode ?? 0, body: null })
        }
      })
    })
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })
}

function udp(port: number, command: Record<string, unknown>, reply: boolean): Promise<any | null> {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4')
    let done = false
    const finish = (v: any | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        sock.close()
      } catch {
        /* already closed */
      }
      resolve(v)
    }
    const timer = setTimeout(() => finish(null), 700)
    sock.on('error', () => finish(null))
    sock.on('message', (data) => {
      try {
        finish(JSON.parse(data.toString('utf8')))
      } catch {
        finish(null)
      }
    })
    sock.send(JSON.stringify({ ...command, source: 'pitglass' }), port, '127.0.0.1', (err) => {
      if (err || !reply) finish(null)
    })
  })
}

export class Apps {
  links: AppLink[] = []
  private timer: NodeJS.Timeout | null = null
  onChange: () => void = () => {}

  start() {
    void this.poll()
    this.timer = setInterval(() => void this.poll(), 5000)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }

  async poll() {
    const [fd, ab, ipg] = await Promise.all([get(FREEDOCK, '/info'), udp(AMBIBOX, { cmd: 'status' }, true), get(IAMPCGAMER, '/status')])
    const freedock = fd?.code === 200 && fd.body?.app === 'freedock'
    const ambibox = !!ab && typeof ab.version === 'string'
    const iam = ipg?.code === 200 && typeof ipg.body?.version === 'string'
    const wheel = iam && Array.isArray(ipg!.body.controllers) ? ipg!.body.controllers.find((c: any) => c?.kind === 'wheel') : null
    const links: AppLink[] = [
      {
        id: 'freedock', name: 'FreeDock', online: freedock, version: freedock ? String(fd!.body.version ?? '') : undefined,
        detail: freedock ? String(fd!.body.page?.name ?? '') : undefined,
        pages: freedock && Array.isArray(fd!.body.pages) ? fd!.body.pages.slice(0, 60).map((p: any) => ({ id: String(p.id), name: String(p.name) })) : undefined
      },
      {
        id: 'ambibox', name: 'Ambibox LED', online: ambibox, version: ambibox ? ab.version : undefined,
        detail: ambibox ? [ab.connected ? 'strip' : 'no strip', ab.mode, ab.fx?.enabled ? 'fx' : ''].filter(Boolean).join(' · ') : undefined
      },
      {
        id: 'iampcgamer', name: 'IAmPcGamer', online: iam, version: iam ? ipg!.body.version : undefined,
        detail: iam ? String(ipg!.body.activeGame ?? '') : undefined
      },
      { id: 'mywheel', name: 'MyWheel', online: !!wheel, detail: wheel ? String(wheel.name ?? '') : undefined }
    ]
    const changed = JSON.stringify(links) !== JSON.stringify(this.links)
    this.links = links
    if (changed) this.onChange()
  }

  /** Short pulse on the LED strip, painted over the ambilight. */
  flash(rgb: [number, number, number], id = 'pitglass') {
    void udp(AMBIBOX, { cmd: 'layer', id, zone: 'all', rgb, alpha: 0.8, blink_ms: 180, ttl_ms: 1100 }, false)
  }

  /** Actions a dashboard button may ask for. Returns false for anything else. */
  async act(app: string, action: string, arg = ''): Promise<boolean> {
    const q = encodeURIComponent(arg.slice(0, 120))
    if (app === 'freedock' && action === 'page') return (await get(FREEDOCK, `/page?id=${q}`))?.code === 200
    if (app === 'freedock' && action === 'notify') return (await get(FREEDOCK, `/notify?source=pitglass&event=done&message=${q}`))?.code === 200
    if (app === 'iampcgamer' && action === 'capture') return (await get(IAMPCGAMER, '/capture'))?.code === 200
    if (app === 'iampcgamer' && action === 'overlay') return (await get(IAMPCGAMER, '/overlay'))?.code === 200
    if (app === 'iampcgamer' && action === 'tip') return (await get(IAMPCGAMER, `/tip?title=${q}`))?.code === 200
    if (app === 'ambibox' && action === 'fx') {
      await udp(AMBIBOX, { cmd: 'fx', enabled: arg !== '0' }, false)
      return true
    }
    if (app === 'ambibox' && action === 'flash') {
      const m = /^#?([0-9a-f]{6})$/i.exec(arg || '#a855f7')
      if (!m) return false
      const v = parseInt(m[1], 16)
      this.flash([v >> 16, (v >> 8) & 255, v & 255], 'pitglass-button')
      return true
    }
    return false
  }
}
