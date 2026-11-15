// The dashboard itself: what runs on the phone. Picks the layout for the running game, follows
// the telemetry, and changes page with a swipe.
import { DEFAULT_LAYOUT } from '../../src/shared/layouts.ts'
import type { Layout } from '../../src/shared/types.ts'
import { el, net, t } from './core.ts'
import { Stage } from './stage.ts'
import type { Ctx } from './widgets.ts'

const store = {
  get(k: string): string {
    try {
      return localStorage.getItem(k) || ''
    } catch {
      return ''
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage blocked: the choice lasts until the page closes */
    }
  }
}

/** The layout for the current game: the one pinned on this screen, the user's choice, or the default. */
export function layoutFor(game: string | null, pinned: string): Layout | null {
  const by = (id: string | undefined) => (id ? net.layouts.find((l) => l.id === id) : undefined)
  const assign = (net.state && net.state.config.assign) || {}
  return by(pinned) || (game ? by(assign[game]) || by(DEFAULT_LAYOUT[game]) : undefined) || by('idle') || net.layouts[0] || null
}

export function mountDash(root: HTMLElement, isLocal: boolean): () => void {
  const view = el('div', 'dash')
  const host = el('div', 'host')
  const dots = el('div', 'dots')
  const banner = el('div', 'banner')
  const tools = el('div', 'tools')
  view.appendChild(host)
  view.appendChild(dots)
  view.appendChild(banner)
  view.appendChild(tools)
  root.appendChild(view)

  // ?layout=<id>&page=<n> in the address opens that layout on this screen, whatever the game (handy for a second screen)
  const query = new URL(location.href).searchParams
  const forced = query.get('layout') || ''
  let pinned = forced || store.get('pg.pin')
  let stage: Stage | null = null
  let sig = ''
  let page = 0
  let lastRev = -1
  let lastTick = 0
  let raf = 0
  let toolsTimer = 0
  const pages: Record<string, number> = {}
  if (forced) pages[forced] = Math.max(0, (Number(query.get('page')) || 1) - 1)

  const ctx: Ctx = {
    edit: false,
    act(app, action, arg) {
      void net.api('POST', '/api/action', { app, action, arg }).catch(() => {})
    }
  }

  const rebuild = () => {
    const layout = layoutFor(net.game, pinned)
    if (!layout) return
    page = Math.min(pages[layout.id] || 0, layout.pages.length - 1)
    const next = `${JSON.stringify(layout)}#${page}`
    if (next === sig) return
    sig = next
    if (stage) stage.destroy()
    stage = new Stage(host, layout, page, ctx)
    view.style.background = layout.theme.bg
    dots.innerHTML = ''
    if (layout.pages.length > 1) layout.pages.forEach((_, i) => dots.appendChild(el('i', i === page ? 'on' : '')))
    lastRev = -1
  }

  const turn = (step: number) => {
    if (!stage) return
    const n = stage.layout.pages.length
    if (n < 2) return
    pages[stage.layout.id] = (page + step + n) % n
    rebuild()
  }

  const showBanner = () => {
    const msg = net.denied ? t('nokey') : net.online ? '' : t('reconnecting')
    banner.textContent = msg
    banner.style.display = msg ? '' : 'none'
  }

  // ---- toolbar: a tap on the screen shows it for a few seconds
  const buildTools = () => {
    tools.innerHTML = ''
    const sel = el('select')
    sel.appendChild(new Option(t('auto'), ''))
    for (const l of net.layouts) if (l.id !== 'idle') sel.appendChild(new Option(l.name, l.id))
    sel.value = pinned
    sel.onchange = () => {
      pinned = sel.value
      store.set('pg.pin', pinned)
      rebuild()
    }
    tools.appendChild(sel)
    const full = el('button', '', t('fullscreen'))
    full.onclick = () => {
      const d = document as any
      const e = document.documentElement as any
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d)
      else {
        const p = (e.requestFullscreen || e.webkitRequestFullscreen).call(e)
        const lock = () => {
          const o = screen.orientation as any
          if (o && o.lock) o.lock('landscape').catch(() => {})
        }
        if (p && p.then) p.then(lock).catch(() => {})
      }
      hideTools()
    }
    tools.appendChild(full)
    if (isLocal) {
      const home = el('button', '', t('panel'))
      home.onclick = () => (location.hash = '#/home')
      tools.appendChild(home)
    }
  }
  const hideTools = () => {
    tools.classList.remove('show')
    clearTimeout(toolsTimer)
  }
  const showTools = () => {
    buildTools()
    tools.classList.add('show')
    clearTimeout(toolsTimer)
    toolsTimer = window.setTimeout(hideTools, 6000)
  }
  tools.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    clearTimeout(toolsTimer)
    toolsTimer = window.setTimeout(hideTools, 9000)
  })

  // ---- swipe to change page, tap for the toolbar
  let sx = 0
  let sy = 0
  let down = false
  const onDown = (e: PointerEvent) => {
    down = true
    sx = e.clientX
    sy = e.clientY
  }
  const onUp = (e: PointerEvent) => {
    if (!down) return
    down = false
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1)
    else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !(e.target as HTMLElement).closest('button,select')) tools.classList.contains('show') ? hideTools() : showTools()
  }
  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', () => (down = false))

  // ---- keep the screen on where the browser allows it (needs https or localhost)
  let lock: any = null
  const wake = () => {
    const wl = (navigator as any).wakeLock
    if (wl && document.visibilityState === 'visible') wl.request('screen').then((l: any) => (lock = l)).catch(() => {})
  }
  wake()
  document.addEventListener('visibilitychange', wake)

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop)
    if (!stage) return
    // telemetry changes redraw right away; clocks and blinking need a slow tick as well
    if (net.rev === lastRev && now - lastTick < 500) return
    lastRev = net.rev
    lastTick = now
    stage.update(net.frame)
  }
  const onResize = () => stage && stage.resize()
  window.addEventListener('resize', onResize)
  let lastGame: string | null | undefined = undefined
  const offs = [
    net.on('frame', () => {
      if (net.game !== lastGame) {
        lastGame = net.game
        rebuild()
      }
    }),
    net.on('layouts', rebuild),
    net.on('state', rebuild),
    net.on('conn', showBanner)
  ]
  rebuild()
  showBanner()
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(toolsTimer)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', wake)
    if (lock && lock.release) lock.release().catch(() => {})
    offs.forEach((off) => off())
    if (stage) stage.destroy()
    root.removeChild(view)
  }
}
