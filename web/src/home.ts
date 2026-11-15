// Control panel, for the PC: pair the phone, pick a layout per game, manage layouts and settings.
import { GAMES } from '../../src/shared/channels.ts'
import { DEFAULT_LAYOUT } from '../../src/shared/layouts.ts'
import type { Config, Layout } from '../../src/shared/types.ts'
import { el, net, t } from './core.ts'
import { SAMPLE, Stage } from './stage.ts'

const SOURCE_OF: Record<string, string> = { ac: 'ac', acevo: 'ac', ets2: 'ets2', ats: 'ets2', beamng: 'beamng', motortown: 'motortown', msfs: 'msfs' }
const noop = { edit: true, act() {} }

export const slug = (name: string) =>
  `${name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'layout'}-${Math.random().toString(36).slice(2, 6)}`

export async function duplicate(l: Layout): Promise<Layout> {
  const copy: Layout = JSON.parse(JSON.stringify(l))
  delete copy.builtin
  copy.name = `${l.name} (${t('copy')})`
  copy.id = slug(l.name)
  copy.author = ''
  const saved = await net.api<Layout>('PUT', '/api/layouts', copy)
  await net.loadLayouts()
  return saved
}

const setConfig = (patch: Partial<Config>) => net.api('POST', '/api/config', patch).catch(() => {})

function select(options: [string, string][], value: string, onChange: (v: string) => void): HTMLSelectElement {
  const s = el('select')
  for (const [v, label] of options) s.appendChild(new Option(label, v))
  s.value = value
  s.onchange = () => onChange(s.value)
  return s
}

const section = (title: string) => {
  const s = el('section', 'card')
  s.appendChild(el('h2', '', title))
  return s
}

export function mountHome(root: HTMLElement): () => void {
  const view = el('div', 'home')
  const head = el('header')
  head.innerHTML = '<div class="logo"><b>Pit</b>Glass</div>'
  const sub = el('div', 'sub', t('tagline'))
  const chip = el('div', 'chip')
  head.appendChild(sub)
  head.appendChild(chip)
  view.appendChild(head)
  const grid = el('div', 'cols')
  const left = el('div')
  const right = el('div')
  grid.appendChild(left)
  grid.appendChild(right)
  view.appendChild(grid)
  root.appendChild(view)

  const phone = section(t('phone'))
  const games = section(t('games'))
  const apps = section(t('apps'))
  const settings = section(t('settings'))
  const layouts = section(t('layouts'))
  left.appendChild(phone)
  left.appendChild(games)
  left.appendChild(apps)
  left.appendChild(settings)
  right.appendChild(layouts)

  let stages: Stage[] = []
  const body = (s: HTMLElement) => {
    while (s.childNodes.length > 1) s.removeChild(s.lastChild!)
    return s
  }

  const drawState = () => {
    const st = net.state
    if (!st) return
    const active = document.activeElement
    if (active && active.tagName === 'SELECT' && view.contains(active)) return // do not pull a menu from under the mouse
    const cfg = st.config
    chip.textContent = `${st.game ? (GAMES[st.game] ? GAMES[st.game].name : st.game) : t('noGame')}${cfg.demo !== 'off' ? ' · demo' : ''} · v${st.version}`
    chip.className = `chip${st.game ? ' on' : ''}`

    // --- phone
    body(phone)
    const row = el('div', 'pair')
    const qr = el('div', 'qr')
    qr.innerHTML = st.qr || ''
    row.appendChild(qr)
    const info = el('div')
    const url = el('code', 'url', st.phoneUrl || '')
    info.appendChild(url)
    info.appendChild(el('p', '', t('phoneHelp')))
    info.appendChild(el('p', 'hint', t('firewall')))
    const open = el('a', 'btn primary', t('openHere'))
    open.href = '#/dash'
    info.appendChild(open)
    info.appendChild(el('span', 'hint', `  ${Math.max(0, st.screens - 1)} ${t('screens')}`))
    row.appendChild(info)
    phone.appendChild(row)

    // --- games
    body(games)
    for (const id of Object.keys(GAMES)) {
      // layouts drawn for this kind of vehicle come first in the menu
      const fits = (l: Layout) => l.kind === GAMES[id].kind
      const pickable = net.layouts.filter((l) => l.id !== 'idle')
      const opts: [string, string][] = [['', t('default')], ...pickable.filter(fits).concat(pickable.filter((l) => !fits(l))).map((l): [string, string] => [l.id, l.name])]
      const src = st.sources.find((s) => s.id === SOURCE_OF[id])
      const live = st.game === id
      const state = live ? 'on' : src && src.state === 'blocked' ? 'blocked' : 'off'
      const r = el('div', 'row')
      r.appendChild(el('i', `led ${state}`))
      const name = el('div', 'grow')
      name.appendChild(el('b', '', GAMES[id].name))
      const note = state === 'blocked' ? `${t('s_blocked')} (${src!.note})` : !live && src && src.note === 'SimConnect.dll' ? t('needDll') : t(`s_${state}`)
      const small = el('small', '', note)
      if (state === 'blocked') small.title = t('blockedHelp')
      name.appendChild(small)
      r.appendChild(name)
      const def = net.layouts.find((l) => l.id === DEFAULT_LAYOUT[id])
      const o = opts.slice()
      o[0] = ['', `${t('default')}${def ? `: ${def.name}` : ''}`]
      r.appendChild(select(o, cfg.assign[id] || '', (v) => void setConfig({ assign: { ...cfg.assign, [id]: v } })))
      games.appendChild(r)
    }

    // --- sibling apps
    body(apps)
    for (const a of st.apps) {
      const r = el('div', 'row')
      r.appendChild(el('i', `led ${a.online ? 'on' : 'off'}`))
      const name = el('div', 'grow')
      name.appendChild(el('b', '', a.name))
      name.appendChild(el('small', '', a.online ? [t('online'), a.version ? `v${a.version}` : '', a.detail].filter(Boolean).join(' · ') : t('offline')))
      r.appendChild(name)
      const act = (action: string, arg = '') => void net.api('POST', '/api/action', { app: a.id, action, arg }).catch(() => {})
      if (a.online && a.id === 'ambibox') {
        const b = el('button', 'btn', t('testFlash'))
        b.onclick = () => act('flash', '#a855f7')
        r.appendChild(b)
      }
      if (a.online && a.id === 'freedock' && a.pages) r.appendChild(select([['', '→ …'], ...a.pages.map((p): [string, string] => [p.id, p.name])], '', (v) => v && act('page', v)))
      if (a.online && a.id === 'iampcgamer') {
        const b = el('button', 'btn', t('capture'))
        b.onclick = () => act('capture')
        r.appendChild(b)
      }
      apps.appendChild(r)
    }
    const lab = el('label', 'check')
    const cb = el('input')
    cb.type = 'checkbox'
    cb.checked = cfg.bestLapFlash
    cb.onchange = () => void setConfig({ bestLapFlash: cb.checked })
    lab.appendChild(cb)
    lab.appendChild(document.createTextNode(` ${t('bestLapFlash')}`))
    apps.appendChild(lab)

    // --- settings
    body(settings)
    const field = (label: string, control: HTMLElement, help = '') => {
      const r = el('div', 'row')
      const n = el('div', 'grow')
      n.appendChild(el('b', '', label))
      if (help) n.appendChild(el('small', '', help))
      r.appendChild(n)
      r.appendChild(control)
      settings.appendChild(r)
    }
    field(t('language'), select([['', 'Auto'], ['en', 'English'], ['pt', 'Português (Brasil)']], cfg.lang, (v) => {
      try {
        localStorage.removeItem('pg.lang')
      } catch {
        /* storage blocked */
      }
      void setConfig({ lang: v as Config['lang'] }).then(() => location.reload())
    }))
    field(t('units'), select([['metric', t('metric')], ['imperial', t('imperial')]], cfg.units, (v) => void setConfig({ units: v as Config['units'] }).then(() => location.reload())))
    field(t('demo'), select([['off', t('d_off')], ['car', t('d_car')], ['truck', t('d_truck')], ['plane', t('d_plane')]], cfg.demo, (v) => void setConfig({ demo: v as Config['demo'] })), t('demoHelp'))
  }

  function scaleMinis() {
    view.querySelectorAll<HTMLElement>('.mini').forEach((m) => {
      m.style.transform = `scale(${m.parentElement!.clientWidth / 800})`
    })
  }

  const drawLayouts = () => {
    stages.forEach((s) => s.destroy())
    stages = []
    body(layouts)
    const bar = el('div', 'bar')
    const add = el('button', 'btn primary', t('newLayout'))
    add.onclick = async () => {
      const l: Layout = {
        pitglass: 1, id: slug('layout'), name: t('newLayout'), kind: 'any', cols: 24, rows: 12,
        theme: { bg: '#05070a', panel: '#0f141b', text: '#f1f5f9', dim: '#7c8a9c', accent: '#38bdf8' }, pages: [{ name: '1', widgets: [] }]
      }
      await net.api('PUT', '/api/layouts', l)
      await net.loadLayouts()
      location.hash = `#/edit/${l.id}`
    }
    bar.appendChild(add)
    const imp = el('button', 'btn', t('import'))
    const file = el('input')
    file.type = 'file'
    file.accept = '.json,application/json'
    file.style.display = 'none'
    file.onchange = async () => {
      const f = file.files && file.files[0]
      if (!f) return
      try {
        const l = JSON.parse(await f.text()) as Layout
        if (!l || l.pitglass !== 1 || !Array.isArray(l.pages)) throw new Error('format')
        delete l.builtin
        if (!l.id || net.layouts.some((x) => x.id === l.id)) l.id = slug(l.name || 'layout')
        await net.api('PUT', '/api/layouts', l)
        await net.loadLayouts()
      } catch {
        alert(t('importBad'))
      }
      file.value = ''
    }
    imp.onclick = () => file.click()
    bar.appendChild(imp)
    bar.appendChild(file)
    layouts.appendChild(bar)

    // the user's own layouts first, then the built-in ones by kind of vehicle
    const groups: [string, Layout[]][] = [['mine', net.layouts.filter((l) => !l.builtin)]]
    for (const k of ['car', 'truck', 'plane', 'any']) groups.push([`k_${k}`, net.layouts.filter((l) => l.builtin && l.kind === k)])
    for (const [title, items] of groups) {
      if (!items.length) continue
      layouts.appendChild(el('h3', 'shelf', `${t(title)} · ${items.length}`))
      const list = el('div', 'gallery')
      layouts.appendChild(list)
      for (const l of items) drawCard(list, l)
    }
    scaleMinis()
  }

  const drawCard = (list: HTMLElement, l: Layout) => {
    {
      const card = el('div', 'layout')
      const prev = el('a', 'prev')
      prev.href = `#/edit/${l.id}`
      card.appendChild(prev)
      const meta = el('div', 'meta')
      meta.appendChild(el('b', '', l.name))
      meta.appendChild(el('small', '', `${t(`k_${l.kind}`)}${l.builtin ? ` · ${t('builtin')}` : ''}${l.pages.length > 1 ? ` · ${l.pages.length} ${t('pages').toLowerCase()}` : ''}`))
      card.appendChild(meta)
      const btns = el('div', 'btns')
      const b = (label: string, fn: () => void, cls = 'btn') => {
        const x = el('button', cls, label)
        x.onclick = fn
        btns.appendChild(x)
      }
      if (!l.builtin) b(t('edit'), () => (location.hash = `#/edit/${l.id}`))
      b(t('duplicate'), () => void duplicate(l).then((c) => (location.hash = `#/edit/${c.id}`)).catch((e) => alert(e.message)))
      b(t('export'), () => {
        const out = { ...l }
        delete out.builtin
        const a = el('a')
        a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }))
        a.download = `${l.id}.pitglass.json`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      })
      if (!l.builtin)
        b(t('remove'), () => {
          if (confirm(t('confirmDelete'))) void net.api('DELETE', `/api/layouts/${encodeURIComponent(l.id)}`).then(() => net.loadLayouts()).catch(() => {})
        }, 'btn danger')
      card.appendChild(btns)
      list.appendChild(card)
      // drawn at phone size and scaled down, so the thumbnail looks like the real thing
      const mini = el('div', 'mini')
      prev.appendChild(mini)
      const st = new Stage(mini, l, 0, noop)
      st.update(SAMPLE[l.kind] || SAMPLE.car)
      stages.push(st)
    }
  }

  const offs = [net.on('state', drawState), net.on('layouts', () => (drawLayouts(), drawState()))]
  drawLayouts()
  drawState()
  const onResize = scaleMinis
  window.addEventListener('resize', onResize)
  return () => {
    offs.forEach((off) => off())
    window.removeEventListener('resize', onResize)
    stages.forEach((s) => s.destroy())
    root.removeChild(view)
  }
}
